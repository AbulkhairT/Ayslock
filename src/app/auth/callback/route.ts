import { NextResponse } from "next/server";
import { modes } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

// Supabase email-confirmation redirect target.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (modes.auth === "supabase" && code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
