"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

export interface SavedProvider {
  username: string;
  display_name: string;
}

const KEY = "ayslock:saved";

export function readSaved(): SavedProvider[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.username === "string") : [];
  } catch {
    return [];
  }
}

export function writeSaved(list: SavedProvider[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // Storage can be unavailable (private windows); saving is a convenience only.
  }
}

/** Saved on this device only; nothing is sent to the server. */
export function SavedProviders() {
  const t = useT();
  const [saved, setSaved] = useState<SavedProvider[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setSaved(readSaved());
  }, []);
  if (!saved.length) return null;
  return (
    <section aria-labelledby="saved-title" className="mt-8 w-full">
      <h2 id="saved-title" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
        {t.booking.saved.title}
      </h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {saved.map((p) => (
          <li key={p.username}>
            <Link href={`/u/${p.username}`} className="flex min-h-14 items-center justify-between gap-3 py-2 hover:text-accent">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.display_name}</span>
                <span className="block truncate text-sm text-muted">@{p.username}</span>
              </span>
              <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2 shrink-0 text-muted"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SaveProviderButton({ provider, className, compact }: { provider: SavedProvider; className?: string; compact?: boolean }) {
  const t = useT().booking.saved;
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setSaved(readSaved().some((p) => p.username === provider.username));
  }, [provider.username]);
  const toggle = () => {
    const list = readSaved().filter((p) => p.username !== provider.username);
    if (!saved) list.unshift(provider);
    writeSaved(list);
    setSaved(!saved);
  };
  const text = saved ? t.savedOn(provider.display_name) : t.saveFor(provider.display_name);
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={compact ? text : undefined} className={className}>
      {compact ? (saved ? t.saved : t.save) : text}
    </button>
  );
}
