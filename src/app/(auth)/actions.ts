"use server";

import { redirect } from "next/navigation";
import { signIn, signOut, signUp } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { normalizeUsername } from "@/lib/username";

export interface AuthState {
  error?: string;
  email?: string;
  info?: string;
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const r = await signUp(email, String(form.get("password") ?? ""), await clientIp());
  if (!r.ok) return { error: r.error, email };
  if (r.confirmEmail) return { info: "Check your email to confirm your account, then log in.", email };
  // Carry the username claimed on the home page into setup.
  const claimed = normalizeUsername(String(form.get("username") ?? ""));
  redirect(claimed ? `/onboarding?u=${claimed}` : "/onboarding");
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const r = await signIn(email, String(form.get("password") ?? ""), await clientIp());
  if (!r.ok) return { error: r.error, email };
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}
