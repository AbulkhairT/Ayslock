"use client";

import { useT } from "@/i18n/client";
import { Logo } from "@/components/Logo";
import { btn } from "@/components/ui";

/** Any page that fails on the server, most often because the database or Supabase is unreachable or misconfigured. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT().common.failure;
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-2 text-muted">{t.body}</p>
      <button type="button" onClick={reset} className={`${btn} mt-6`}>{t.retry}</button>
      <p className="mt-6 text-sm text-muted">{t.owner}</p>
    </main>
  );
}
