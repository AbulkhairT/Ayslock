import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { providerByOwner } from "@/lib/providers";
import { requireUser } from "@/lib/session";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { OnboardingForm } from "./OnboardingForm";

export async function generateMetadata() {
  return { title: (await getT()).onboarding.metaTitle };
}

export default async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const u = (await searchParams).u;
  const user = await requireUser();
  if (await providerByOwner(await getDb(), user.id)) redirect("/dashboard");
  const t = (await getT()).onboarding;
  return (
    <main id="main" className="mx-auto max-w-xl px-4 pb-16 pt-2 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Logo />
        <LanguageSwitch />
      </div>
      <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mb-8 mt-3 text-lg text-muted">{t.lead}</p>
      <OnboardingForm appHost={env.appUrl.replace(/^https?:\/\//, "")} initialUsername={typeof u === "string" ? u.slice(0, 31) : ""} />
    </main>
  );
}
