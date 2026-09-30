import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { cleanQuery, searchProviders, type SearchResult } from "@/lib/search";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { BookingDemo } from "./_home/BookingDemo";
import { ProviderSearch } from "./_home/ProviderSearch";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  let results: SearchResult[] | null = null;
  let error: string | undefined;
  // Searching without JavaScript (or pressing Enter before live results arrive) lands here.
  if (cleanQuery(query)) {
    const db = await getDb();
    try {
      await rateLimit(db, `search:${await clientIp()}`, 120, 60);
      results = await searchProviders(db, query);
    } catch (e) {
      error = (e as Error).message;
    }
    const exact = results?.find((r) => r.exact);
    const go = (query.trim().startsWith("@") && exact) || (results?.length === 1 ? results[0] : null);
    if (go) redirect(`/u/${go.username}`);
  }
  const demo = modes.auth === "demo";

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Logo />
        <Link href="/signin" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-[15px] font-medium hover:border-ink">
          Sign in
        </Link>
      </header>

      <main id="main">
        <section className="mx-auto max-w-xl px-4 pb-16 pt-8 sm:px-6 sm:pt-20">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-5xl">Who are you booking with?</h1>
          <p className="mb-6 mt-3 text-[17px] text-muted">Find them, pick a time, done. No account or app needed.</p>
          <ProviderSearch initialQuery={query} initialResults={results} initialError={error} />
          {demo && !query && (
            <p className="mt-4 text-[15px] text-muted">
              Just looking? Try <Link className="font-medium text-accent hover:underline" href="/u/marco">@marco</Link>,{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/lena">@lena</Link> or{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/sofia">@sofia</Link>.
            </p>
          )}
          <SavedProviders />
          <p className="mt-10 text-[15px] text-muted">
            Offer a service? <Link href="/signup" className="font-medium text-accent hover:underline">Create your profile</Link>
          </p>
        </section>

        <section aria-labelledby="how-title" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="how-title" className="mb-8 text-2xl font-semibold tracking-tight">How booking works</h2>
            <BookingDemo />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo />
          <div className="flex">
            <Link href="/signup" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Create your profile</Link>
            <Link href="/signin" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
