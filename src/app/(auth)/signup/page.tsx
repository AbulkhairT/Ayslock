import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { modes } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { signUpAction } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Create your profile · Ayslock" };

export default async function SignUp() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main id="main" className="mx-auto max-w-md px-5 pb-16 pt-8">
      <Logo />
      <h1 className="mt-10 text-3xl font-bold tracking-tight">Create your Ayslock</h1>
      <p className="mt-2 text-muted">Get a link like ayslock.app/u/you and let clients book in a few taps.</p>
      <div className={`${card} mt-6`}>
        {modes.auth === "demo" && (
          <p className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
            <strong>Demo sign-up.</strong> Accounts are stored in the local demo database. No email is verified.
          </p>
        )}
        <AuthForm action={signUpAction} submitLabel="Create account" newPassword />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have one? <Link href="/signin" className="font-semibold text-accent">Sign in</Link>
      </p>
    </main>
  );
}
