import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { env, envSources, modes } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * What this deployment is connected to, by variable NAME only (never values), so a
 * setup problem can be diagnosed from the browser: open /api/status.
 */
export async function GET() {
  let database: "ok" | "error" | "not connected" = "not connected";
  if (modes.db === "postgres") {
    try {
      await (await getDb()).query("select 1 from providers limit 1");
      database = "ok";
    } catch {
      database = "error";
    }
  }
  return NextResponse.json({
    database: { mode: modes.db === "postgres" ? "postgres" : "none (temporary demo storage)", variable: envSources.database, reachable: database },
    signIn: { mode: modes.auth === "supabase" ? "supabase" : "simulated", urlVariable: envSources.supabaseUrl, keyVariable: envSources.supabaseKey },
    email: { mode: modes.email === "resend" ? "resend" : "not set up", resendKey: !!env.resendApiKey, emailFrom: !!env.emailFrom },
    appUrl: env.appUrl,
  }, { headers: { "Cache-Control": "no-store" } });
}
