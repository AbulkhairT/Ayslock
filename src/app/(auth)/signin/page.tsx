import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { modes } from "@/lib/env";
import { DEMO_PASSWORD, DEMO_PROVIDERS } from "@/lib/seed";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { signInAction } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Sign in · Ayslock" };

export default async function SignIn() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main id="main" className="mx-auto max-w-md px-5 pb-16 pt-8">
      <Logo />
      <h1 className="mt-10 text-3xl font-bold tracking-tight">Provider sign in</h1>
      <div className={`${card} mt-6`}>
        <AuthForm action={signInAction} submitLabel="Sign in" />
      </div>
      {modes.auth === "demo" && modes.db === "pglite" && (
        <section className="mt-6 rounded-3xl border border-dashed border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <h2 className="font-bold">Demo accounts (simulated sign-in)</h2>
          <p className="mt-1">Password for all: <code className="font-mono font-semibold">{DEMO_PASSWORD}</code></p>
          <ul className="mt-2 space-y-1">
            {DEMO_PROVIDERS.map((p) => (
              <li key={p.username}>
                <code className="font-mono">{p.email}</code> · @{p.username} ({p.access_mode === "open" ? "open" : p.access_mode === "approval" ? "approval required" : "private"})
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        New to Ayslock? <Link href="/signup" className="font-semibold text-accent">Create your profile</Link>
      </p>
    </main>
  );
}
