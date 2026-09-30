"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [saved, setSaved] = useState<SavedProvider[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setSaved(readSaved());
  }, []);
  if (!saved.length) return null;
  return (
    <section aria-labelledby="saved-title" className="mt-10 w-full">
      <h2 id="saved-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Saved on this device
      </h2>
      <ul className="flex flex-wrap gap-2">
        {saved.map((p) => (
          <li key={p.username}>
            <Link href={`/u/${p.username}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-ink">
              {p.display_name} <span className="font-normal text-muted">@{p.username}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SaveProviderButton({ provider, className }: { provider: SavedProvider; className?: string }) {
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
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} className={className}>
      {saved ? `★ Saved ${provider.display_name}` : `☆ Save ${provider.display_name} for next time`}
    </button>
  );
}
