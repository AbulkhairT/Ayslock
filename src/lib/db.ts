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

async function migrate(db: Db, opts: { includeDemo: boolean; includeSupabase: boolean }) {
  await db.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name),
  );
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => opts.includeSupabase || !SUPABASE_ONLY.test(f))
    .sort()
    .map((f) => ({ name: f, file: path.join(MIGRATIONS_DIR, f) }));
  if (opts.includeDemo) files.push({ name: "demo.sql", file: DEMO_SQL });
  for (const m of files) {
    if (applied.has(m.name)) continue;
    const sql = fs.readFileSync(m.file, "utf8");
    await db.tx(async (q) => {
      await exec(q, sql);
      await q.query("insert into schema_migrations (name) values ($1)", [m.name]);
    });
  }
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

async function createPostgres(url: string): Promise<Db> {
  const pgmod = await import("pg");
  const Pool = pgmod.default?.Pool ?? pgmod.Pool;
  const pool = new Pool({ connectionString: url, max: 10 });
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
  includeSupabase?: boolean;
  autoMigrate?: boolean;
}

export async function openDb(o: OpenOptions): Promise<Db> {
  const db = o.kind === "postgres" ? await createPostgres(o.url!) : await createPglite(o.dataDir!);
  if (o.autoMigrate !== false) {
    await migrate(db, { includeDemo: !!o.includeDemo, includeSupabase: !!o.includeSupabase });
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
        // On a real deployment, apply migrations with the Supabase CLI or `npm run db:migrate`.
        autoMigrate: modes.db === "pglite",
      });
      if (modes.db === "pglite") {
        const { seedDemo } = await import("./seed");
        await seedDemo(db);
      }
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
