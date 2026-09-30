"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/i18n/actions";
import { useLocale } from "@/i18n/client";

/** Two-letter switch between English and Russian. The choice is remembered on this device. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "ru" ? "en" : "ru";
  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() => start(async () => { await setLocaleAction(next); router.refresh(); })}
      aria-label={next === "ru" ? "Русский язык" : "English language"}
      title={next === "ru" ? "Русский" : "English"}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2 text-[15px] font-semibold text-muted hover:text-ink disabled:opacity-60 ${className}`}
    >
      {next === "ru" ? "RU" : "EN"}
    </button>
  );
}
