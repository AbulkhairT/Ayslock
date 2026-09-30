import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { modes } from "@/lib/env";
import { DEMO_PASSWORD, DEMO_PROVIDERS } from "@/lib/seed";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { NoDatabaseNotice } from "@/components/NoDatabase";
import { Notice } from "@/components/Notice";
import { signInAction } from "../actions";
import { AuthForm } from "../AuthForm";

export async function generateMetadata() {
  return { title: (await getT()).auth.signIn.metaTitle };
}

export default async function SignIn({ searchParams }: PageProps<"/signin">) {
  const err = (await searchParams).err;
  if (await currentUser()) redirect("/dashboard");
  const t = (await getT()).auth.signIn;
  return (
    <main id="main" className="mx-auto max-w-md px-4 pb-16 pt-2 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Logo />
        <LanguageSwitch />
      </div>
      <NoDatabaseNotice className="mt-6" what={t.noDatabase} />
      <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      {err === "link" && (
        <div className="mt-6">
          <Notice tone="bad">{t.badLink}</Notice>
        </div>
      )}
      <div className="mt-8">
        <AuthForm action={signInAction} submitLabel={t.submit} />
      </div>
      {modes.auth === "demo" && (
        <section className="mt-6 rounded-2xl border border-dashed border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <h2 className="font-semibold">{t.demoTitle}</h2>
          <p className="mt-1">{t.demoPassword} <code className="font-mono font-semibold">{DEMO_PASSWORD}</code></p>
          <ul className="mt-2 space-y-1">
            {DEMO_PROVIDERS.map((p) => (
              <li key={p.username}>
                <code className="font-mono">{p.email}</code> · @{p.username} ({t.demoModes[p.access_mode]})
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-center text-muted">
        {t.noPage} <Link href="/signup" className="font-semibold text-ink underline">{t.createOne}</Link>
      </p>
    </main>
  );
}
