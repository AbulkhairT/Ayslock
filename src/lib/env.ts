// Which backends are real and which are simulated. Every simulated part is labeled in the UI.
export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  cronSecret: process.env.CRON_SECRET || "",
  pgliteDir: process.env.PGLITE_DIR || ".data/pglite",
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
