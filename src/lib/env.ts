// Which backends are real and which are simulated. Every simulated part is labeled in the UI.

/**
 * Read the first variable that is set, by exact name or with any prefix. Vercel's storage
 * integrations (Supabase, Neon) let you pick a prefix, so POSTGRES_URL can arrive as
 * STORAGE_POSTGRES_URL or SUPABASE_POSTGRES_URL. Returns the value and the name it came from.
 */
function pick(names: string[]): { value: string; from: string | null } {
  const all = process.env;
  for (const n of names) if (all[n]) return { value: all[n]!, from: n };
  const keys = Object.keys(all).sort();
  for (const n of names) {
    const k = keys.find((key) => key.endsWith(`_${n}`) && all[key]);
    if (k) return { value: all[k]!, from: k };
  }
  return { value: "", from: null };
}

// Pooled connection strings first; the unpooled ones still work, just with fewer connections to spare.
const db = pick(["DATABASE_URL", "POSTGRES_URL", "SUPABASE_DB_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]);
const sbUrl = pick(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
// Older projects call it the anon key; newer ones (and the Vercel integration) the publishable key.
const sbKey = pick(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"]);

/** Names (never values) of the variables in use, for the status endpoint. */
export const envSources = { database: db.from, supabaseUrl: sbUrl.from, supabaseKey: sbKey.from };

export const env = {
  databaseUrl: db.value,
  supabaseUrl: sbUrl.value,
  supabaseAnonKey: sbKey.value,
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  // On Vercel without APP_URL, use the project's production domain (set by Vercel itself).
  appUrl: (
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  cronSecret: process.env.CRON_SECRET || "",
};

export const modes = {
  /** Real Postgres (Supabase or any Postgres) vs. embedded PGlite stored on disk. */
  db: env.databaseUrl ? ("postgres" as const) : ("pglite" as const),
  /** Supabase Auth vs. simulated local sign-in. */
  auth: env.supabaseUrl && env.supabaseAnonKey ? ("supabase" as const) : ("demo" as const),
  /** Resend delivery vs. an on-screen preview. */
  email: env.resendApiKey && env.emailFrom ? ("resend" as const) : ("preview" as const),
};

export const isDemo = modes.auth === "demo" || modes.email === "preview" || modes.db === "pglite";

/**
 * Demo mode (simulated sign-in, demo profiles, a local database) must be switched on on purpose
 * wherever the site is hosted: DEMO_MODE=1. On your own computer it stays automatic.
 * Hosted = on Vercel, or AYSLOCK_HOSTED=1 on any other host.
 */
const hosted = !!process.env.VERCEL || process.env.AYSLOCK_HOSTED === "1";
const demoRequested = /^(1|true|yes)$/i.test(process.env.DEMO_MODE ?? "");
export const demo = {
  hosted,
  requested: demoRequested,
  allowed: demoRequested || !hosted,
};

/**
 * Variables a hosted production site is missing. When this isn't empty the site shows a setup
 * page instead of quietly running on simulated sign-in or throwaway data. Names only, never values.
 */
export const configProblems: string[] = demo.allowed
  ? []
  : [
      ...(modes.db === "pglite" ? ["DATABASE_URL (or POSTGRES_URL)"] : []),
      ...(!env.supabaseUrl ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
      ...(!env.supabaseAnonKey ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"] : []),
    ];

export class ConfigError extends Error {
  constructor() {
    super(`Ayslock is not configured: missing ${configProblems.join(", ")}. Set DEMO_MODE=1 to run the demo instead.`);
  }
}
