import { NextResponse } from "next/server";
import { modes } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

// Supabase email-confirmation redirect target. Only same-site paths are allowed as `next`.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  if (modes.auth === "supabase" && code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/signin?err=link", url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
