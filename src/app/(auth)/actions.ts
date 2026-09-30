"use server";

import { redirect } from "next/navigation";
import { signIn, signOut, signUp } from "@/lib/auth";
import { env } from "@/lib/env";
import { clientIp, requestOrigin } from "@/lib/request";
import { normalizeUsername } from "@/lib/username";

export interface AuthState {
  error?: string;
  email?: string;
  info?: string;
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  // Carry the username claimed on the home page into setup, also through email confirmation.
  const claimed = normalizeUsername(String(form.get("username") ?? ""));
  const next = claimed ? `/onboarding?u=${claimed}` : "/onboarding";
  const r = await signUp(email, String(form.get("password") ?? ""), await clientIp(), next, await requestOrigin(env.appUrl));
  if (!r.ok) return { error: r.error, email };
  if (r.confirmEmail) return { info: `We sent a link to ${email}. Open it on this device to confirm your account and finish setting up.`, email };
  redirect(next);
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
