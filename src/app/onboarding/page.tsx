import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { providerByOwner } from "@/lib/providers";
import { requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Set up your profile · Ayslock" };

export default async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const u = (await searchParams).u;
  const user = await requireUser();
  if (await providerByOwner(await getDb(), user.id)) redirect("/dashboard");
  return (
    <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-6">
      <Logo />
      <h1 className="mt-12 text-4xl font-semibold tracking-tight">Set up your page</h1>
      <p className="mb-8 mt-3 text-lg text-muted">Three quick steps. You can change everything later.</p>
      <OnboardingForm appHost={env.appUrl.replace(/^https?:\/\//, "")} initialUsername={typeof u === "string" ? u.slice(0, 31) : ""} />
    </main>
  );
}
