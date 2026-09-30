import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { env, modes } from "@/lib/env";
import { providerByUsername } from "@/lib/providers";
import { usernameProblem } from "@/lib/username";
import { Logo } from "@/components/Logo";
import { NoDatabaseNotice } from "@/components/NoDatabase";
import { signUpAction } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Create your page · Ayslock" };

export default async function SignUp({ searchParams }: PageProps<"/signup">) {
  const raw = (await searchParams).u;
  const wanted = (typeof raw === "string" ? raw : "").trim().replace(/^@+/, "").toLowerCase().slice(0, 40);
  if (await currentUser()) redirect(wanted ? `/onboarding?u=${encodeURIComponent(wanted)}` : "/dashboard");
  // Only carry a name forward if it can actually be claimed right now.
  const problem = wanted ? usernameProblem(wanted) ?? ((await providerByUsername(await getDb(), wanted)) ? `@${wanted} is taken. You can pick another in the next step.` : null) : null;
  const claim = wanted && !problem ? wanted : undefined;
  const host = env.appUrl.replace(/^https?:\/\//, "");

  return (
    <main id="main" className="mx-auto max-w-md px-4 pb-16 pt-2 sm:px-6">
      <Logo />
      <NoDatabaseNotice className="mt-6" what="A new account can disappear right after you create it." />
      <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-tight">Create your page</h1>
      {claim ? (
        <p className="mt-3 text-lg text-muted">
          <span className="font-medium text-ink">{host}/@{claim}</span> is free. Add an email and password to keep it.
        </p>
      ) : (
        <p className="mt-3 text-lg text-muted">{problem ?? "An email and a password. You'll pick your @username next."}</p>
      )}
      <div className="mt-8">
        {modes.auth === "demo" && (
          <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-[15px] text-warn">
            <strong>Demo sign-up.</strong> Accounts are stored in the demo database. No email is verified.
          </p>
        )}
        <AuthForm action={signUpAction} submitLabel="Create account" newPassword username={claim} />
      </div>
      <p className="mt-6 text-center text-muted">
        Already have a page? <Link href="/signin" className="font-semibold text-ink underline">Log in</Link>
      </p>
    </main>
  );
}
