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
      <label htmlFor={id} className="mb-2 block text-[15px] font-medium text-muted">Choose your username</label>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-surface pl-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <span aria-hidden className="text-lg text-muted">@</span>
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
            className="h-12 min-w-0 flex-1 bg-transparent pl-1 pr-3 text-lg text-ink placeholder:text-muted/60 focus:outline-none focus-visible:outline-none"
          />
        </div>
        <button type="submit" disabled={shown.state === "problem"} className="h-12 shrink-0 rounded-xl border border-ink/70 bg-surface px-5 text-base font-semibold text-ink transition-colors hover:bg-canvas disabled:border-line disabled:text-muted">
          Create
        </button>
      </div>
      <p id={`${id}-status`} aria-live="polite" className={`mt-2 min-h-5 text-sm ${shown.state === "free" ? "text-ok" : shown.state === "problem" ? "text-bad" : "text-muted"}`}>
        {shown.state === "free" ? `${shown.message}. Your link: ${host}/@${name}` : shown.state === "problem" ? shown.message : shown.state === "checking" ? "Checking…" : "Free to set up. You can change it later."}
      </p>
    </form>
  );
}
