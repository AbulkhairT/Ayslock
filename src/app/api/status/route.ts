import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { configProblems, demo, env, envSources, modes } from "@/lib/env";

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
  let providers: { real: number; demo: number; withoutAccountInThisProject?: number } | null = null;
  if (modes.db === "postgres" && !configProblems.length) {
    try {
      const db = await getDb();
      const [r] = await db.query<{ real: number; demo: number }>(
        "select count(*) filter (where not demo)::int as real, count(*) filter (where demo)::int as demo from providers");
      providers = r ?? { real: 0, demo: 0 };
      // On a Supabase database: profiles whose owner isn't an account in this project's Authentication → Users.
      const [a] = await db.query<{ ok: boolean }>(`select to_regclass('auth.users') is not null and has_table_privilege('auth.users', 'select') as ok`);
      if (a?.ok) {
        const [o] = await db.query<{ n: number }>(
          "select count(*)::int as n from providers p where not p.demo and not exists (select 1 from auth.users u where u.id = p.owner_id)");
        providers = { ...providers, withoutAccountInThisProject: o?.n ?? 0 };
      }
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const dbHost = databaseHost();
  const authProject = supabaseProject();
  return NextResponse.json({
    // Missing settings on a hosted site: it shows a setup page instead of running on demo data.
    setupMissing: configProblems,
    demoMode: { on: modes.auth === "demo" || modes.db === "pglite", allowed: demo.allowed, why: demo.requested ? "DEMO_MODE is set" : demo.hosted ? "off: hosted, DEMO_MODE not set" : "local computer" },
    database: { mode: modes.db === "postgres" ? "postgres" : "none (temporary demo storage)", variable: envSources.database, host: dbHost.host, supabaseProject: dbHost.supabaseProject, reachable: database, providerProfiles: providers /* demo = made with simulated sign-in, hidden unless demo mode is on */ },
    signIn: { mode: modes.auth === "supabase" ? "supabase" : "simulated", urlVariable: envSources.supabaseUrl, keyVariable: envSources.supabaseKey, supabaseProject: authProject },
    sameSupabaseProject: dbHost.supabaseProject && authProject ? dbHost.supabaseProject === authProject : null,
    email: { mode: modes.email === "resend" ? "resend" : "not set up", resendKey: !!env.resendApiKey, emailFrom: !!env.emailFrom },
    appUrl: env.appUrl,
  }, { headers: { "Cache-Control": "no-store" } });
}
