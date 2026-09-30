import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { cleanQuery, searchProviders, type SearchResult } from "@/lib/search";
import { getLocale, getT } from "@/i18n/server";
import { localizeError } from "@/i18n";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { BookingDemo } from "./_home/BookingDemo";
import { ProviderSearch } from "./_home/ProviderSearch";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
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
      error = localizeError((e as Error).message, locale);
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
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <Link href="/signin" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-[15px] font-medium hover:border-ink">
            {t.common.signIn}
          </Link>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-xl px-4 pb-16 pt-8 sm:px-6 sm:pt-20">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-5xl">{t.home.heading}</h1>
          <p className="mb-6 mt-3 text-[17px] text-muted">{t.home.sub}</p>
          <ProviderSearch initialQuery={query} initialResults={results} initialError={error} />
          {demo && !query && (
            <p className="mt-4 text-[15px] text-muted">
              {t.home.justLooking} <Link className="font-medium text-accent hover:underline" href="/u/marco">@marco</Link>,{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/lena">@lena</Link> {t.home.or}{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/sofia">@sofia</Link>.
            </p>
          )}
          <SavedProviders />
          <p className="mt-10 text-[15px] text-muted">
            {t.home.offerService} <Link href="/signup" className="font-medium text-accent hover:underline">{t.common.createProfile}</Link>
          </p>
        </section>

        <section aria-labelledby="how-title" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="how-title" className="mb-8 text-2xl font-semibold tracking-tight">{t.home.howTitle}</h2>
            <BookingDemo />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo />
          <div className="flex">
            <Link href="/signup" className="inline-flex min-h-11 items-center px-3 hover:text-ink">{t.common.createProfile}</Link>
            <Link href="/signin" className="inline-flex min-h-11 items-center px-3 hover:text-ink">{t.common.signIn}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
