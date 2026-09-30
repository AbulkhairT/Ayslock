import fs from "node:fs";
import path from "node:path";
import { demoStorage } from "./demo-storage";
import { env, modes } from "./env";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const DEMO_SQL = path.join(process.cwd(), "db", "demo.sql");

/** Migrations that only make sense on Supabase (they reference auth.uid()). */
const SUPABASE_ONLY = /_rls\.sql$/;

const CORE_TABLE = "providers";

/**
 * Apply pending migrations (and optionally the demo seed) in one transaction under an
 * advisory lock, so several server instances starting at once can't race each other.
 * A database set up earlier with `supabase db push` is detected and baselined.
 */
async function migrate(db: Db, opts: { includeDemo: boolean; includeSupabase: boolean | "auto"; seed?: boolean }) {
  await db.tx(async (q) => {
    await q.query("select pg_advisory_xact_lock(724501)");
    await q.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const applied = new Set((await q.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
    const [probe] = await q.query<{ core: boolean; auth: boolean; rls: boolean }>(
      `select to_regclass($1) is not null as core,
              exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'uid') as auth,
              exists (select 1 from pg_policies where policyname = 'providers_owner') as rls`,
      [`public.${CORE_TABLE}`],
    );
    const includeSupabase = opts.includeSupabase === "auto" ? probe.auth : opts.includeSupabase;
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .filter((f) => includeSupabase || !SUPABASE_ONLY.test(f))
      .sort()
      .map((f) => ({ name: f, file: path.join(MIGRATIONS_DIR, f) }));
    if (opts.includeDemo) files.push({ name: "demo.sql", file: DEMO_SQL });
    if (applied.size === 0 && probe.core) {
      // Schema already created outside this runner (for example by the Supabase CLI).
      for (const m of files) {
        const already = m.name === "demo.sql" ? false : SUPABASE_ONLY.test(m.name) ? probe.rls : true;
        if (already) {
          await q.query("insert into schema_migrations (name) values ($1) on conflict do nothing", [m.name]);
          applied.add(m.name);
        }
      }
    }
    for (const m of files) {
      if (applied.has(m.name)) continue;
      await exec(q, fs.readFileSync(m.file, "utf8"));
      await q.query("insert into schema_migrations (name) values ($1)", [m.name]);
    }
    if (opts.seed) {
      const { seedDemo } = await import("./seed");
      await seedDemo(q);
    }
  });
}

/** Run a multi-statement script. */
async function exec(q: Queryable, sql: string) {
  const anyQ = q as unknown as { exec?: (s: string) => Promise<unknown> };
  if (typeof anyQ.exec === "function") await anyQ.exec(sql);
  else await q.query(sql);
}

async function createPglite(dataDir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  if (dataDir !== "memory://") fs.mkdirSync(dataDir, { recursive: true });
  const pg = await PGlite.create(dataDir, { extensions: { btree_gist } });
  const wrap = (q: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (s: string) => Promise<unknown> }): Queryable & { exec: (s: string) => Promise<unknown> } => ({
    query: async <T,>(text: string, params?: unknown[]) => (await q.query(text, params)).rows as T[],
    exec: (s: string) => q.exec(s),
  });
  const base = wrap(pg as never);
  // PGlite is a single connection, so transactions run one at a time. The exclusion
  // constraint still rejects overlaps exactly as it does on a real server.
  return {
    ...base,
    tx: (fn) => pg.transaction((tx) => fn(wrap(tx as never))),
    close: () => pg.close(),
  };
}

/**
 * Hosted Postgres (Supabase, Neon) needs TLS. Their poolers present certificates Node
 * can't always verify from sslmode in the URL alone, so TLS is configured here instead.
 * Set PGSSL_STRICT=1 (with NODE_EXTRA_CA_CERTS) to require full certificate checks.
 */
export function poolConfig(url: string) {
  const u = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname) || u.searchParams.get("sslmode") === "disable";
  u.searchParams.delete("sslmode");
  u.searchParams.delete("sslrootcert");
  return {
    connectionString: u.toString(),
    ssl: local ? undefined : { rejectUnauthorized: process.env.PGSSL_STRICT === "1" },
    // Serverless platforms run many small instances; keep each one's share of connections low.
    max: process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? 3 : 10,
    idleTimeoutMillis: 10_000,
  };
}

async function createPostgres(url: string): Promise<Db> {
  const pgmod = await import("pg");
  const Pool = pgmod.default?.Pool ?? pgmod.Pool;
  const pool = new Pool(poolConfig(url));
  return {
    query: async <T,>(text: string, params?: unknown[]) => (await pool.query(text, params as unknown[])).rows as T[],
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({
          query: async <T,>(text: string, params?: unknown[]) => (await client.query(text, params as unknown[])).rows as T[],
        });
        await client.query("commit");
        return result;
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export interface OpenOptions {
  kind: "pglite" | "postgres";
  url?: string;
  dataDir?: string;
  includeDemo?: boolean;
  includeSupabase?: boolean | "auto";
  autoMigrate?: boolean;
  seed?: boolean;
}

export async function openDb(o: OpenOptions): Promise<Db> {
  const db = o.kind === "postgres" ? await createPostgres(o.url!) : await createPglite(o.dataDir!);
  if (o.autoMigrate !== false) {
    await migrate(db, { includeDemo: !!o.includeDemo, includeSupabase: o.includeSupabase ?? false, seed: o.seed });
  }
  return db;
}

export { migrate };

const g = globalThis as unknown as { __aysDb?: Promise<Db> };

/** App-wide database handle. */
export function getDb(): Promise<Db> {
  if (!g.__aysDb) {
    g.__aysDb = (async () => {
      const db = await openDb({
        kind: modes.db,
        url: env.databaseUrl,
        dataDir: modes.db === "pglite" ? demoStorage().dir : "",
        includeDemo: modes.auth === "demo",
        // Idempotent and locked, so it's safe on every cold start. The RLS policies are
        // applied automatically when the database is a Supabase project.
        includeSupabase: "auto",
        // Demo profiles only exist while sign-in is simulated.
        seed: modes.auth === "demo",
      });
      return db;
    })();
    g.__aysDb.catch(() => {
      g.__aysDb = undefined;
    });
  }
  return g.__aysDb;
}

export function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}
