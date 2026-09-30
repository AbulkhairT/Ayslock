"use client";

import { useState } from "react";
import { btn, input, label, textarea } from "@/components/ui";

export function AccessRequestForm({ username, displayName, invalidLink }: { username: string; displayName: string; invalidLink: boolean }) {
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
    setError(data?.error || "Something went wrong. Please try again.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <section className="rounded-3xl border border-line bg-white p-6 text-center" aria-live="polite">
        <p className="text-4xl" aria-hidden>✉️</p>
        <h2 className="mt-2 text-lg font-bold">Request sent</h2>
        <p className="mt-1 text-muted">If {displayName} approves it, you&apos;ll get an email with a private link to book.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="access-title" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 id="access-title" className="text-lg font-bold">Ask to book</h2>
      <p className="mt-1 text-sm text-muted">{displayName} shares available times by invitation. Send a quick request and you&apos;ll get a private booking link by email once approved.</p>
      {invalidLink && (
        <p role="alert" className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          That booking link has expired or was turned off. You can ask for a new one below.
        </p>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
      >
        <div>
          <label htmlFor="ar-name" className={label}>Your name</label>
          <input id="ar-name" name="name" required autoComplete="name" className={input} maxLength={100} />
        </div>
        <div>
          <label htmlFor="ar-email" className={label}>Email</label>
          <input id="ar-email" name="email" type="email" required autoComplete="email" className={input} maxLength={200} />
        </div>
        <div>
          <label htmlFor="ar-msg" className={label}>Message <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="ar-msg" name="message" rows={3} className={textarea} maxLength={500} placeholder="How do you know them, or what do you need?" />
        </div>
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="ar-website">Leave this empty</label>
          <input id="ar-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
        <button type="submit" className={`${btn} w-full`} disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request access"}
        </button>
      </form>
    </section>
  );
}
