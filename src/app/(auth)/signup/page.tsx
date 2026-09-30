import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { env, modes } from "@/lib/env";
import { providerByUsername } from "@/lib/providers";
import { usernameProblem } from "@/lib/username";
import { localizeError } from "@/i18n";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { NoDatabaseNotice } from "@/components/NoDatabase";
import { signUpAction } from "../actions";
import { AuthForm } from "../AuthForm";

export async function generateMetadata() {
  return { title: (await getT()).auth.signUp.metaTitle };
}

export default async function SignUp({ searchParams }: PageProps<"/signup">) {
  const raw = (await searchParams).u;
  const wanted = (typeof raw === "string" ? raw : "").trim().replace(/^@+/, "").toLowerCase().slice(0, 40);
  if (await currentUser()) redirect(wanted ? `/onboarding?u=${encodeURIComponent(wanted)}` : "/dashboard");
  const { locale, auth } = await getT();
  const t = auth.signUp;
  // Only carry a name forward if it can actually be claimed right now.
  const invalid = wanted ? usernameProblem(wanted) : null;
  const problem = wanted
    ? invalid
      ? localizeError(invalid, locale)
      : (await providerByUsername(await getDb(), wanted)) ? t.taken(wanted) : null
    : null;
  const claim = wanted && !problem ? wanted : undefined;
  const host = env.appUrl.replace(/^https?:\/\//, "");

  return (
    <main id="main" className="mx-auto max-w-md px-4 pb-16 pt-2 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Logo />
        <LanguageSwitch />
      </div>
      <NoDatabaseNotice className="mt-6" what={t.noDatabase} />
      <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      {claim ? (
        <p className="mt-3 text-lg text-muted">
          <span className="font-medium text-ink">{host}/@{claim}</span> {t.isFree}
        </p>
      ) : (
        <p className="mt-3 text-lg text-muted">{problem ?? t.lead}</p>
      )}
      <div className="mt-8">
        {modes.auth === "demo" && (
          <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-[15px] text-warn">
            <strong>{t.demoStrong}</strong> {t.demoBody}
          </p>
        )}
        <AuthForm action={signUpAction} submitLabel={t.submit} newPassword username={claim} />
      </div>
      <p className="mt-6 text-center text-muted">
        {t.haveOne} <Link href="/signin" className="font-semibold text-ink underline">{t.logIn}</Link>
      </p>
    </main>
  );
}
