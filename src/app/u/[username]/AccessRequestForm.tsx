"use client";

import { useState } from "react";
import { btn, input, label, textarea } from "@/components/ui";

export function AccessRequestForm({ username, displayName, invalidLink, emailOn = true }: { username: string; displayName: string; invalidLink: boolean; emailOn?: boolean }) {
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
      <section className="border-y border-line py-8" aria-live="polite">
        <h2 className="text-xl font-semibold tracking-tight">Request sent</h2>
        <p className="mt-1 text-muted">{emailOn ? <>If {displayName} approves it, you&apos;ll get an email with a private link to book.</> : <>If {displayName} approves it, they&apos;ll send you a private link to book.</>}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="access-title">
      <h2 id="access-title" className="text-xl font-semibold tracking-tight">Ask to book</h2>
      <p className="mt-1 text-[15px] text-muted">{displayName} shares available times by invitation. Send a quick request and you&apos;ll get a private booking link once approved.</p>
      {invalidLink && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-[15px] text-warn">
          That booking link has expired or was turned off. You can ask for a new one below.
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
        {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p>}
        <button type="submit" className={`${btn} w-full`} disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request access"}
        </button>
      </form>
    </section>
  );
}
