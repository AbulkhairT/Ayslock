// Apply supabase/migrations/*.sql to DATABASE_URL (skip if you use `supabase db push`).
import { migrate, openDb } from "../src/lib/db";

(async () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Set DATABASE_URL (or POSTGRES_URL).");
  const db = await openDb({ kind: "postgres", url, autoMigrate: false });
  const onSupabase = process.argv.includes("--supabase");
  await migrate(db, { includeDemo: process.argv.includes("--demo-auth"), includeSupabase: onSupabase ? true : "auto" });
  console.log(`Migrations applied${onSupabase ? " (including RLS policies)" : ""}.`);
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
