import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAccess } from "@/lib/access";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDuration, fmtPrice } from "@/lib/format";
import { locationLine } from "@/lib/messages";
import { providerByUsername, servicesFor } from "@/lib/providers";
import { normalizeUsername } from "@/lib/username";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
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
  if (!p) return { title: "Not found · Ayslock", robots: { index: false } };
  // Profiles are reachable by exact username only; keep them out of search indexes.
  return { title: `Book ${p.display_name} (@${p.username}) · Ayslock`, robots: { index: false, follow: false } };
}

export default async function ProviderPage({ params, searchParams }: PageProps<"/u/[username]">) {
  const provider = await load((await params).username);
  if (!provider) notFound();
  const sp = await searchParams;
  const k = typeof sp.k === "string" ? sp.k : null;
  const db = await getDb();
  const services = await servicesFor(db, provider.id);
  const grant = provider.access_mode === "private" && k ? await verifyAccess(db, provider, k) : null;
  const canSeeTimes = provider.access_mode !== "private" || !!grant;
  const location = locationLine(provider);

  return (
    <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
      </header>

      <section className="mb-6 flex items-start gap-4">
        <Avatar name={provider.display_name} url={provider.avatar_url} size={80} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{provider.display_name}</h1>
          <p className="font-semibold text-accent">@{provider.username}</p>
          <p className="mt-1 text-sm text-muted">
            <span aria-hidden>{provider.location_kind === "online" ? "💻 " : "📍 "}</span>
            {location}
          </p>
        </div>
      </section>
      {provider.bio && <p className="mb-6 text-base leading-relaxed">{provider.bio}</p>}

      {provider.access_mode === "approval" && (
        <p className="mb-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">Bookings are confirmed once {provider.display_name.split(" ")[0]} approves them.</p>
      )}
      {grant && (
        <p className="mb-4 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          Private booking link for {grant.name}. Valid until {fmtDate(grant.expires_at!, provider.timezone)}.
        </p>
      )}

      {services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-8 text-center text-muted">{provider.display_name} isn&apos;t taking bookings yet.</div>
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
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration_minutes,
            durationLabel: fmtDuration(s.duration_minutes),
            price: fmtPrice(s.price_cents, s.currency),
          }))}
        />
      ) : (
        <div className="space-y-4">
          <section aria-labelledby="svc-title" className="rounded-3xl border border-line bg-white p-5">
            <h2 id="svc-title" className="mb-3 text-lg font-bold">Services</h2>
            <ul className="divide-y divide-line">
              {services.map((s) => (
                <li key={s.id} className="flex justify-between gap-4 py-3">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-sm text-muted">
                    {fmtDuration(s.duration_minutes)}
                    {s.price_cents != null && ` · ${fmtPrice(s.price_cents, s.currency)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <AccessRequestForm username={provider.username} displayName={provider.display_name} invalidLink={!!k} />
        </div>
      )}

      <div className="mt-6 text-center">
        <SaveProviderButton provider={{ username: provider.username, display_name: provider.display_name }} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink" />
      </div>
    </main>
  );
}
