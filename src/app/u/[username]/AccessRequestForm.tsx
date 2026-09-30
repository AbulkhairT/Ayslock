"use client";

import { useState } from "react";
import { btn, input, label, textarea } from "@/components/ui";
import { useT } from "@/i18n/client";

export function AccessRequestForm({ username, displayName, invalidLink, emailOn = true }: { username: string; displayName: string; invalidLink: boolean; emailOn?: boolean }) {
  const dict = useT();
  const t = dict.booking.access;
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    setState("sending");
    setError(null);
    const fd = new FormData(form);
    const res = await fetch("/api/access-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name: fd.get("name"), email: fd.get("email"), message: fd.get("message"), website: fd.get("website") }),
    }).catch(() => null);
    if (res?.ok) return setState("sent");
    const data = await res?.json().catch(() => null);
    setError(data?.error || dict.common.somethingWrong);
    setState("idle");
  }

  if (state === "sent") {
    return (
      <section className="border-y border-line py-8" aria-live="polite">
        <h2 className="text-xl font-semibold tracking-tight">{t.sentTitle}</h2>
        <p className="mt-1 text-muted">{emailOn ? t.sentEmail(displayName) : t.sentNoEmail(displayName)}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="access-title">
      <h2 id="access-title" className="text-xl font-semibold tracking-tight">{t.title}</h2>
      <p className="mt-1 text-[15px] text-muted">{t.intro(displayName)}</p>
      {invalidLink && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-[15px] text-warn">
          {t.invalidLink}
        </p>
      )}
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
      >
        <div>
          <label htmlFor="ar-name" className={label}>{dict.booking.flow.yourName}</label>
          <input id="ar-name" name="name" required autoComplete="name" className={input} maxLength={100} />
        </div>
        <div>
          <label htmlFor="ar-email" className={label}>{dict.booking.flow.email}</label>
          <input id="ar-email" name="email" type="email" required autoComplete="email" className={input} maxLength={200} />
        </div>
        <div>
          <label htmlFor="ar-msg" className={label}>{t.message} <span className="font-normal text-muted">({dict.common.optional})</span></label>
          <textarea id="ar-msg" name="message" rows={3} className={textarea} maxLength={500} placeholder={t.placeholder} />
        </div>
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="ar-website">{dict.booking.flow.honeypot}</label>
          <input id="ar-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p>}
        <button type="submit" className={`${btn} w-full`} disabled={state === "sending"}>
          {state === "sending" ? t.sending : t.request}
        </button>
      </form>
    </section>
  );
}
