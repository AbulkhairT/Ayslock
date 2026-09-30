"use client";

import { useEffect, useState } from "react";

type Check = { state: "idle" | "checking" | "free" | "problem"; message?: string };

/** "@ [ name ] Create". Checks the name as people type, then carries it into sign-up. */
export function ClaimForm({ host, id = "claim" }: { host: string; id?: string }) {
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const name = value.trim().replace(/^@+/, "").toLowerCase();

  useEffect(() => {
    if (!name) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setCheck({ state: "checking" });
      try {
        const r = await fetch(`/api/username?u=${encodeURIComponent(name)}`, { signal: ctl.signal });
        const d: { available: boolean; reason: string | null } = await r.json();
        setCheck(d.available ? { state: "free", message: `@${name} is free` } : { state: "problem", message: d.reason ?? "Try another." });
      } catch {
        if (!ctl.signal.aborted) setCheck({ state: "idle" });
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [name]);

  const shown = name ? check : { state: "idle" as const };

  return (
    <form action="/signup" method="get" className="w-full">
      <label htmlFor={id} className="sr-only">Choose your username</label>
      <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_30px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-ink/15">
        <span aria-hidden className="shrink-0 text-lg text-muted">@</span>
        <input
          id={id}
          name="u"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={31}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname"
          aria-describedby={`${id}-status`}
          className="min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-muted/50 focus:outline-none focus-visible:outline-none"
        />
        <button type="submit" disabled={shown.state === "problem"} className="h-12 shrink-0 rounded-full bg-ink px-6 text-base font-semibold text-white transition hover:bg-ink/85 disabled:opacity-40">
          Create
        </button>
      </div>
      <p id={`${id}-status`} aria-live="polite" className={`mt-3 min-h-5 pl-5 text-sm ${shown.state === "free" ? "text-ok" : shown.state === "problem" ? "text-bad" : "text-muted"}`}>
        {shown.state === "free" ? `${shown.message}. Your link: ${host}/@${name}` : shown.state === "problem" ? shown.message : shown.state === "checking" ? "Checking…" : "Pick the name clients will type. It's free."}
      </p>
    </form>
  );
}
