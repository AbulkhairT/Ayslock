import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { env, envSources, modes } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Where the database lives and, on Supabase, its project id. Both are public, unlike the URL itself. */
function databaseHost(): { host: string | null; supabaseProject: string | null } {
  try {
    const u = new URL(env.databaseUrl);
    const host = /\.supabase\.(co|com)$/.test(u.hostname) ? "supabase" : /neon\.tech$/.test(u.hostname) ? "neon" : "other";
    // Direct: db.<ref>.supabase.co. Pooler: user postgres.<ref> on *.pooler.supabase.com.
    const ref = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ?? decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]+)$/)?.[1] ?? null;
    return { host, supabaseProject: ref };
  } catch {
    return { host: null, supabaseProject: null };
  }
}

function supabaseProject(): string | null {
  try {
    return new URL(env.supabaseUrl).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * What this deployment is connected to, by variable NAME only (never values), so a
 * setup problem can be diagnosed from the browser: open /api/status.
 */
export async function GET() {
  let database: "ok" | "error" | "not connected" = "not connected";
  let providers: number | null = null;
  if (modes.db === "postgres") {
    try {
      const [r] = await (await getDb()).query<{ n: number }>("select count(*)::int as n from providers");
      providers = r?.n ?? 0;
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const dbHost = databaseHost();
  const authProject = supabaseProject();
  return NextResponse.json({
    database: { mode: modes.db === "postgres" ? "postgres" : "none (temporary demo storage)", variable: envSources.database, host: dbHost.host, supabaseProject: dbHost.supabaseProject, reachable: database, providerProfiles: providers },
    signIn: { mode: modes.auth === "supabase" ? "supabase" : "simulated", urlVariable: envSources.supabaseUrl, keyVariable: envSources.supabaseKey, supabaseProject: authProject },
    sameSupabaseProject: dbHost.supabaseProject && authProject ? dbHost.supabaseProject === authProject : null,
    email: { mode: modes.email === "resend" ? "resend" : "not set up", resendKey: !!env.resendApiKey, emailFrom: !!env.emailFrom },
    appUrl: env.appUrl,
  }, { headers: { "Cache-Control": "no-store" } });
}
