import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configProblems, env } from "@/lib/env";

const SESSION_PATHS = /^\/($|dashboard|onboarding|signin|signup|auth\/)/;

// A hosted site with missing settings shows the setup page instead of running on demo data.
// Otherwise: refresh the Supabase session cookie (nothing to do in local demo mode).
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (configProblems.length && path !== "/setup-required" && path !== "/api/status") {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "This site isn't set up yet.", missing: configProblems }, { status: 503 });
    }
    return NextResponse.rewrite(new URL("/setup-required", request.url), { status: 503 });
  }
  const url = env.supabaseUrl;
  const key = env.supabaseAnonKey;
  if (!url || !key || !SESSION_PATHS.test(path)) return NextResponse.next();
  // If Supabase's Site URL is used instead of our callback (its redirect list doesn't include it),
  // the confirmation lands on "/?code=…". Finish the sign-in anyway.
  const code = request.nextUrl.searchParams.get("code");
  if (code && !request.nextUrl.pathname.startsWith("/auth/")) {
    const to = new URL("/auth/callback", request.url);
    to.searchParams.set("code", code);
    to.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(to);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
