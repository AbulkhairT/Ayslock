import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appointmentByToken } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { fmtDate, fmtDuration, fmtTime, fmtZone } from "@/lib/format";
import { locationLine } from "@/lib/messages";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { SaveProviderButton } from "@/components/SavedProviders";
import { btnDanger, btnSecondary } from "@/components/ui";
import { cancelBooking } from "./actions";
import { Reschedule } from "./Reschedule";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking · Ayslock", robots: { index: false, follow: false }, referrer: "no-referrer" };

const STATUS = {
  confirmed: { title: "You're booked", tone: "ok" as const, icon: "✓" },
  pending: { title: "Request sent. Waiting for approval", tone: "warn" as const, icon: "…" },
  cancelled: { title: "This booking is cancelled", tone: "bad" as const, icon: "×" },
  declined: { title: "This request wasn't approved", tone: "bad" as const, icon: "×" },
  expired: { title: "This request expired", tone: "bad" as const, icon: "×" },
};

export default async function ManagePage({ params, searchParams }: PageProps<"/b/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const m = await appointmentByToken(await getDb(), token);
  if (!m) notFound();
  const { appointment: a, provider, service } = m;
  const zone = a.client_timezone || provider.timezone;
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);
  const live = (a.status === "confirmed" || a.status === "pending") && start > new Date();
  const s = STATUS[a.status];
  const duration = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-6">
      <header className="mb-6"><Logo /></header>

      <div className="mb-5 text-center">
        <span aria-hidden className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-bold ${s.tone === "ok" ? "bg-ok-soft text-ok" : s.tone === "warn" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>{s.icon}</span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{s.title}</h1>
        {a.status === "pending" && a.expires_at && (
          <p className="mt-1 text-sm text-muted">
            {provider.display_name} has until {fmtDate(a.expires_at, zone)} at {fmtTime(a.expires_at, zone)} to approve. The time is held for you until then.
          </p>
        )}
      </div>

      <div className="mb-4 space-y-2">
        {sp.new && <Notice tone="ok">{modes.email === "preview" ? <>Demo mode: the confirmation email to {m.client.email} is shown in the <Link className="underline" href="/demo/outbox">notification preview</Link>, not sent.</> : <>Confirmation sent to {m.client.email}.</>}</Notice>}
        {sp.moved && <Notice tone="ok">Your new time is saved.</Notice>}
        {sp.cancelled && <Notice tone="info">Cancelled. {provider.display_name} has been told.</Notice>}
        {typeof sp.err === "string" && <Notice tone="bad">{sp.err}</Notice>}
      </div>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={provider.display_name} url={provider.avatar_url} size={48} />
          <div>
            <p className="font-bold">{provider.display_name}</p>
            <Link href={`/u/${provider.username}`} className="text-sm font-semibold text-accent">@{provider.username}</Link>
          </div>
        </div>
        <dl className="grid gap-3 text-sm">
          <Row k="Service" v={`${a.service_name} (${fmtDuration(duration)})`} />
          <Row k="Date" v={fmtDate(start, zone)} />
          <Row k="Time" v={`${fmtTime(start, zone)} – ${fmtTime(end, zone)}`} />
          <Row k="Timezone" v={fmtZone(zone, start)} />
          <Row k="Where" v={locationLine(provider)} />
          <Row k="Booked for" v={`${m.client.name}`} />
        </dl>
      </section>

      {live && (
        <div className="mt-4 space-y-3">
          <a href={`/b/${token}/ics`} className={`${btnSecondary} w-full`}>
            Add to calendar (.ics)
          </a>
          {service && service.active && (
            <Reschedule token={token} username={provider.username} serviceId={service.id} zone={zone} horizonDays={provider.horizon_days} approval={provider.access_mode === "approval"} />
          )}
          <details className="rounded-3xl border border-line bg-white p-5">
            <summary className="cursor-pointer font-semibold text-bad">Cancel booking</summary>
            <form action={cancelBooking} className="mt-3">
              <input type="hidden" name="token" value={token} />
              <p className="mb-3 text-sm text-muted">{provider.display_name} will be told. This can&apos;t be undone.</p>
              <button type="submit" className={`${btnDanger} w-full`}>Yes, cancel it</button>
            </form>
          </details>
        </div>
      )}

      {!live && (a.status === "cancelled" || a.status === "declined" || a.status === "expired") && (
        <Link href={`/u/${provider.username}`} className={`${btnSecondary} mt-4 w-full`}>
          Book another time
        </Link>
      )}

      <div className="mt-6 rounded-3xl bg-accent-soft p-5 text-center">
        <p className="text-sm text-accent-strong">Coming back? Save {provider.display_name} on this device.</p>
        <SaveProviderButton provider={{ username: provider.username, display_name: provider.display_name }} className="mt-2 min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-accent-strong" />
      </div>
      <p className="mt-6 text-center text-xs text-muted">This page is your private link to manage the booking. Don&apos;t share it.</p>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}
