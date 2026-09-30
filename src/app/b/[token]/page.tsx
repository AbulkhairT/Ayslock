import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appointmentByToken } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { fmtDate, fmtDuration, fmtTime, fmtZone } from "@/lib/format";
import { locationLine } from "@/lib/messages";
import { localizeError } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { NoDatabaseNotice, noSharedDatabase } from "@/components/NoDatabase";
import { Notice } from "@/components/Notice";
import { SaveProviderButton } from "@/components/SavedProviders";
import { btn, btnDanger, btnSecondary } from "@/components/ui";
import { cancelBooking } from "./actions";
import { Reschedule } from "./Reschedule";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.booking.manage.metaTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

const TONE = { confirmed: "ok", pending: "warn", cancelled: "bad", declined: "bad", expired: "bad" } as const;

function StatusIcon({ tone }: { tone: "ok" | "warn" | "bad" }) {
  const path = tone === "ok" ? "M5 10.5l3.5 3.5L15 7" : tone === "warn" ? "M10 5.5V10l3 2" : "M6.5 6.5l7 7M13.5 6.5l-7 7";
  return (
    <span aria-hidden className={`grid h-12 w-12 place-items-center rounded-full ${tone === "ok" ? "bg-ok-soft text-ok" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
      <svg viewBox="0 0 20 20" className="h-6 w-6"><path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export default async function ManagePage({ params, searchParams }: PageProps<"/b/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const locale = await getLocale();
  const t = (await getT()).booking.manage;
  const m = await appointmentByToken(await getDb(), token);
  if (!m) {
    if (!noSharedDatabase()) notFound();
    return (
      <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <header className="mb-6 flex items-center justify-between gap-3"><Logo /><LanguageSwitch /></header>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t.cantShow}</h1>
        <NoDatabaseNotice what={t.noDbWhat} />
        <Link href="/" className="mt-6 inline-block font-semibold text-accent underline">{t.backHome}</Link>
      </main>
    );
  }
  const { appointment: a, provider, service } = m;
  const zone = a.client_timezone || provider.timezone;
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);
  const live = (a.status === "confirmed" || a.status === "pending") && start > new Date();
  const s = { ...t.status[a.status], tone: TONE[a.status] };
  const duration = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <main id="main" className="mx-auto max-w-xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-2"><Logo /><LanguageSwitch /></header>

      <div className="mt-6">
        <StatusIcon tone={s.tone} />
        <p className={`mt-4 text-[13px] font-semibold uppercase tracking-wide ${s.tone === "ok" ? "text-ok" : s.tone === "warn" ? "text-warn" : "text-bad"}`}>{s.label}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{s.title}</h1>
        {a.status === "pending" && a.expires_at && (
          <p className="mt-2 text-[15px] text-muted">
            {t.pendingUntil(provider.display_name, fmtDate(a.expires_at, zone, locale), fmtTime(a.expires_at, zone, locale))}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2 empty:hidden">
        {sp.new && (modes.email === "resend" ? (
          <Notice tone="ok">{t.sentTo(m.client.email)}</Notice>
        ) : modes.auth === "demo" ? (
          <Notice tone="ok">{t.demoBefore(m.client.email)}<Link className="underline" href="/demo/outbox">{t.demoLink}</Link>{t.demoAfter}</Notice>
        ) : (
          <Notice tone="info">{t.savePage}</Notice>
        ))}
        {sp.moved && <Notice tone="ok">{t.moved}</Notice>}
        {sp.cancelled && <Notice tone="info">{t.cancelled(provider.display_name)}</Notice>}
        {typeof sp.err === "string" && <Notice tone="bad">{localizeError(sp.err, locale)}</Notice>}
      </div>

      <section aria-label={t.details} className="mt-6">
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={provider.display_name} url={provider.avatar_url} size={44} />
          <div className="min-w-0">
            <p className="break-words font-semibold">{provider.display_name}</p>
            <Link href={`/u/${provider.username}`} className="text-sm text-accent hover:underline">@{provider.username}</Link>
          </div>
        </div>
        <dl className="mt-3 divide-y divide-line border-y border-line text-[15px]">
          <Row k={t.service} v={`${a.service_name} (${fmtDuration(duration, locale)})`} />
          <Row k={t.date} v={fmtDate(start, zone, locale)} />
          <Row k={t.time} v={`${fmtTime(start, zone, locale)} – ${fmtTime(end, zone, locale)}`} />
          <Row k={t.timezone} v={fmtZone(zone, start)} />
          <Row k={t.where} v={locationLine(provider, locale)} />
          <Row k={t.bookedFor} v={`${m.client.name}`} />
        </dl>
      </section>

      {live && (
        <div className="mt-6 space-y-3">
          <a href={`/b/${token}/ics`} className={`${btnSecondary} w-full`}>
            {t.addToCalendar}
          </a>
          {service && service.active && (
            <Reschedule token={token} username={provider.username} serviceId={service.id} zone={zone} horizonDays={provider.horizon_days} approval={provider.access_mode === "approval"} />
          )}
          <details className="group">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-bad">{t.cancel}</summary>
            <form action={cancelBooking} className="mt-2 rounded-xl bg-bad-soft p-4">
              <input type="hidden" name="token" value={token} />
              <p className="mb-3 text-[15px] text-bad">{t.cancelWarn(provider.display_name)}</p>
              <button type="submit" className={`${btnDanger} w-full`}>{t.cancelYes}</button>
            </form>
          </details>
        </div>
      )}

      {!live && (a.status === "cancelled" || a.status === "declined" || a.status === "expired") && (
        <Link href={`/u/${provider.username}`} className={`${btn} mt-6 w-full`}>
          {t.bookAnother}
        </Link>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <p className="text-[15px] text-muted">{t.comingBack(provider.display_name.split(" ")[0])}</p>
        <SaveProviderButton provider={{ username: provider.username, display_name: provider.display_name }} className="min-h-11 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft aria-pressed:text-ok" />
      </div>
      <p className="mt-6 text-sm text-muted">{t.privateNote}</p>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{v}</dd>
    </div>
  );
}
