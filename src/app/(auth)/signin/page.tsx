import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { modes } from "@/lib/env";
import { DEMO_PASSWORD, DEMO_PROVIDERS } from "@/lib/seed";
import { Logo } from "@/components/Logo";
import { NoDatabaseNotice } from "@/components/NoDatabase";
import { card } from "@/components/ui";
import { signInAction } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Log in · Ayslock" };

export default async function SignIn() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main id="main" className="mx-auto max-w-md px-5 pb-16 pt-6">
      <Logo />
      <NoDatabaseNotice className="mt-6" what="Sign-ins can drop out right after you log in." />
      <h1 className="mt-12 text-4xl font-semibold tracking-tight">Log in to your page</h1>
      <div className={`${card} mt-8`}>
        <AuthForm action={signInAction} submitLabel="Log in" />
      </div>
      {modes.auth === "demo" && (
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
      <p className="mt-6 text-center text-muted">
        No page yet? <Link href="/signup" className="font-semibold text-ink underline">Create one</Link>
      </p>
    </main>
  );
}
