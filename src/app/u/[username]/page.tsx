import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAccess } from "@/lib/access";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { fmtDate, fmtDuration, fmtPrice } from "@/lib/format";
import { locationLine } from "@/lib/messages";
import { providerByUsername, servicesFor } from "@/lib/providers";
import { normalizeUsername } from "@/lib/username";
import { getLocale, getT } from "@/i18n/server";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { SaveProviderButton } from "@/components/SavedProviders";
import { AccessRequestForm } from "./AccessRequestForm";
import { BookingFlow } from "./BookingFlow";

export const dynamic = "force-dynamic";

async function load(raw: string) {
  const username = normalizeUsername(decodeURIComponent(raw));
  if (!username) return null;
  const db = await getDb();
  return providerByUsername(db, username);
}

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const p = await load((await params).username);
  const t = (await getT()).booking.profile;
  if (!p) return { title: t.metaNotFound, robots: { index: false } };
  // Profiles are reachable by exact username only; keep them out of search indexes.
  const title = t.metaTitle(p.display_name, p.username);
  const description = p.profession ? t.metaDescWith(p.profession) : t.metaDesc;
  // Link previews in WhatsApp and Messages use these. Pages stay out of search engines.
  return { title, description, openGraph: { title: t.ogTitle(p.display_name), description, siteName: "Ayslock", type: "profile" }, robots: { index: false, follow: false } };
}

export default async function ProviderPage({ params, searchParams }: PageProps<"/u/[username]">) {
  const provider = await load((await params).username);
  if (!provider) notFound();
  const locale = await getLocale();
  const dict = await getT();
  const t = dict.booking.profile;
  const sp = await searchParams;
  const k = typeof sp.k === "string" ? sp.k : null;
  const db = await getDb();
  const services = await servicesFor(db, provider.id);
  const grant = provider.access_mode === "private" && k ? await verifyAccess(db, provider, k) : null;
  const canSeeTimes = provider.access_mode !== "private" || !!grant;
  const location = locationLine(provider, locale);

  const first = provider.display_name.split(" ")[0];
  // Demo mode previews emails on screen, so the wording about email still holds there.
  const emailOn = modes.email === "resend" || modes.auth === "demo";

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-2">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <SaveProviderButton provider={{ username: provider.username, display_name: provider.display_name }} compact className="min-h-11 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft aria-pressed:text-ok" />
        </div>
      </header>

      <section className="mt-6 flex items-center gap-4">
        <Avatar name={provider.display_name} url={provider.avatar_url} size={64} />
        <div className="min-w-0">
          <h1 className={`break-words font-semibold leading-tight tracking-tight ${provider.display_name.length > 24 ? "text-[22px]" : "text-[28px]"}`}>{provider.display_name}</h1>
          {provider.profession && <p className="break-words font-medium">{provider.profession}</p>}
          <p className="text-muted">
            @{provider.username}
            <span aria-hidden> · </span>
            <span className={provider.access_mode === "open" ? "text-ok" : provider.access_mode === "approval" ? "text-warn" : "text-accent"}>
              {dict.common.mode[provider.access_mode]}
            </span>
          </p>
        </div>
      </section>
      <p className="mt-4 break-words text-[15px] text-muted">{location}</p>
      {provider.bio && <p className="mt-2 break-words text-base leading-relaxed">{provider.bio}</p>}

      <div className="mt-6 space-y-2">
        {provider.access_mode === "approval" && (
          <Notice tone="info">{t.approves(first)} {emailOn ? t.emailWhenConfirmed : t.pageWhenConfirmed}</Notice>
        )}
        {grant && (
          <Notice tone="ok">{t.privateLink(grant.name, fmtDate(grant.expires_at!, provider.timezone, locale))}</Notice>
        )}
      </div>

      <div className="mt-8">
        {services.length === 0 ? (
          <p className="border-y border-line py-10 text-center text-muted">{t.notTaking(provider.display_name)}</p>
        ) : canSeeTimes ? (
          <BookingFlow
            username={provider.username}
            displayName={provider.display_name}
            providerZone={provider.timezone}
            location={location}
            mode={provider.access_mode}
            pendingHours={provider.pending_expiry_hours}
            horizonDays={provider.horizon_days}
            accessToken={grant ? k : null}
            emailOn={emailOn}
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              duration: s.duration_minutes,
              durationLabel: fmtDuration(s.duration_minutes, locale),
              price: fmtPrice(s.price_cents, s.currency, locale),
            }))}
          />
        ) : (
          <div className="space-y-10">
            <section aria-labelledby="svc-title">
              <h2 id="svc-title" className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t.services}</h2>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {services.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 py-3.5">
                    <span className="min-w-0 break-words font-medium">{s.name}</span>
                    <span className="flex shrink-0 gap-4 text-[15px] tabular-nums">
                      <span className="text-muted">{fmtDuration(s.duration_minutes, locale)}</span>
                      {s.price_cents != null && <span className="min-w-12 text-right">{fmtPrice(s.price_cents, s.currency, locale)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <AccessRequestForm username={provider.username} displayName={provider.display_name} invalidLink={!!k} emailOn={emailOn} />
          </div>
        )}
      </div>
    </main>
  );
}
