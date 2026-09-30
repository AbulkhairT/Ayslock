import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Refreshes the Supabase session cookie. Does nothing in local demo mode.
export async function proxy(request: NextRequest) {
  const url = env.supabaseUrl;
  const key = env.supabaseAnonKey;
  if (!url || !key) return NextResponse.next();
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
  matcher: ["/", "/dashboard/:path*", "/onboarding/:path*", "/signin", "/signup", "/auth/:path*"],
};
