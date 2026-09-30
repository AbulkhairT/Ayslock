// Which backends are real and which are simulated. Every simulated part is labeled in the UI.
export const env = {
  // Vercel's Postgres/Neon integration sets POSTGRES_URL; Supabase gives you DATABASE_URL.
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
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
