import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { providerByOwner } from "@/lib/providers";
import { requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Set up your profile · Ayslock" };

export default async function Onboarding() {
  const user = await requireUser();
  if (await providerByOwner(await getDb(), user.id)) redirect("/dashboard");
  return (
    <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-8">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Set up your Ayslock</h1>
      <p className="mt-2 mb-6 text-muted">Three quick steps. You can edit everything later.</p>
      <OnboardingForm appHost={env.appUrl.replace(/^https?:\/\//, "")} />
    </main>
  );
}
