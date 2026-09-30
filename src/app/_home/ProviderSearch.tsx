"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { SearchResult } from "@/lib/search";

const MODE_NOTE: Record<string, string> = { approval: "Approves each booking", private: "Invite only" };

function minLength(q: string) {
  return q.trim().replace(/^@+/, "").length >= 2;
}

/**
 * The main action on the home page. Works as a plain GET form without JavaScript;
 * with it, results appear as you type.
 */
export function ProviderSearch({ initialQuery, initialResults, initialError }: { initialQuery: string; initialResults: SearchResult[] | null; initialError?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(initialResults);
  const [searched, setSearched] = useState(initialQuery);
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (q === searched) return;
    if (!minLength(q)) {
      const id = ++seq.current;
      const t = setTimeout(() => { if (id === seq.current) { setResults(null); setSearched(q); setError(""); } }, 0);
      return () => clearTimeout(t);
    }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (id !== seq.current) return;
      setLoading(false);
      setSearched(q);
      if (res?.ok && data) {
        setResults(data.results);
        setError("");
      } else {
        setError(data?.error || "Search isn't working right now. If you have their link, open it directly.");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, searched]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!minLength(q)) {
      e.preventDefault();
      setError("Type at least two letters of their name or @username.");
      return;
    }
    // Typed an @username, or there's exactly one match: go straight to the booking page.
    const up = q === searched ? results : null;
    const exact = up?.find((r) => r.exact);
    const go = (q.trim().startsWith("@") && exact) || (up?.length === 1 ? up[0] : null);
    if (go) {
      e.preventDefault();
      router.push(`/u/${go.username}`);
    }
  }

  const shown = minLength(q) && q === searched;
  const handle = q.trim().replace(/^@+/, "");

  return (
    <div className="w-full">
      <form action="/" method="get" role="search" onSubmit={onSubmit} noValidate>
        <label htmlFor="q" className="sr-only">Enter a name or @username</label>
        <div className="flex gap-2">
          <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-surface pl-4 focus-within:ring-2 focus-within:ring-accent/20 ${error ? "border-bad" : "border-line focus-within:border-accent"}`}>
            <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 shrink-0 text-muted"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input
              id="q"
              name="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={60}
              placeholder="Name or @username"
              aria-invalid={!!error}
              aria-describedby="q-status"
              className="ays-bare h-14 min-w-0 flex-1 bg-transparent pr-3 text-lg text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <button type="submit" className="h-14 shrink-0 rounded-xl bg-accent px-5 text-base font-semibold text-white transition-colors hover:bg-accent-strong sm:px-6">
            Search
          </button>
        </div>
      </form>

      <div id="q-status" aria-live="polite" className="mt-3 min-h-6">
        {error ? (
          <p role="alert" className="text-[15px] text-bad">{error}</p>
        ) : loading && !shown ? (
          <p className="text-[15px] text-muted">Searching…</p>
        ) : shown && results && results.length === 0 ? (
          <div className="border-y border-line py-5">
            <p className="font-medium">No one found for &ldquo;{q.trim()}&rdquo;.</p>
            <p className="mt-1 text-[15px] text-muted">
              {/^[a-z0-9_]+$/i.test(handle) ? <>Check the spelling of @{handle.toLowerCase()} with them, or ask for their booking link.</> : <>Check the spelling, or ask them for their booking link.</>}{" "}
              Some people can only be found by their exact @username.
            </p>
          </div>
        ) : shown && results ? (
          <p className="sr-only">{results.length === 1 ? "1 result" : `${results.length} results`}</p>
        ) : null}
      </div>

      {shown && results && results.length > 0 && (
        <ul className="divide-y divide-line border-y border-line" aria-label="Search results">
          {results.map((r) => (
            <li key={r.username}>
              <Link href={`/u/${r.username}`} className="group flex min-h-16 items-center gap-3 py-3">
                <Avatar name={r.display_name} url={r.avatar_url} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold group-hover:text-accent">{r.display_name}</span>
                  <span className="block truncate text-[15px] text-muted">
                    @{r.username}
                    {r.profession && <> · {r.profession}</>}
                  </span>
                  {MODE_NOTE[r.access_mode] && <span className="block text-sm text-muted">{MODE_NOTE[r.access_mode]}</span>}
                </span>
                <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2 shrink-0 text-muted"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
