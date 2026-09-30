import { DateTime } from "luxon";
import Link from "next/link";
import { accessLink, listAccessGrants } from "@/lib/access";
import { sweepExpired } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDuration, fmtTime } from "@/lib/format";
import { servicesFor } from "@/lib/providers";
import { requireProvider } from "@/lib/session";
import type { Provider } from "@/lib/types";
import type { Dict, Locale } from "@/i18n";
import { getT } from "@/i18n/server";
import { CopyButton } from "@/components/CopyButton";
import { btnDanger, btnSmall, btnSmallAccent, input, label } from "@/components/ui";
import {
  addAppointmentAction, approveAccessAction, approveAction, blockTimeAction, cancelAction, declineAccessAction, declineAction,
  revokeAccessAction, rescheduleAction,
} from "./actions";
import { Flash } from "./Flash";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: (await getT()).dashboard.schedule.metaTitle };
}

interface Row {
  id: string;
  kind: "booking" | "block";
  status: "pending" | "confirmed";
  starts_at: Date;
  ends_at: Date;
  expires_at: Date | null;
  service_name: string | null;
  title: string | null;
  client_note: string | null;
  source: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

const SELECT = `select a.id, a.kind, a.status, a.starts_at, a.ends_at, a.expires_at, a.service_name, a.title, a.client_note, a.source,
  a.client_id, c.name as client_name, c.email as client_email, c.phone as client_phone
  from appointments a left join clients c on c.id = a.client_id and c.provider_id = a.provider_id`;

export default async function Schedule({ searchParams }: PageProps<"/dashboard">) {
  const provider = await requireProvider();
  const sp = await searchParams;
  const dict = await getT();
  const { locale } = dict;
  const t = dict.dashboard.schedule;
  const f = t.fmt;
  const zone = provider.timezone;
  const lx = locale === "ru" ? "ru" : "en-US";
  const today = DateTime.now().setZone(zone).setLocale(lx).startOf("day");
  const view = sp.view === "week" ? "week" : "day";
  const picked = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? DateTime.fromISO(sp.date, { zone, locale: lx }) : today;
  const start = view === "week" ? picked.startOf("week") : picked.startOf("day");
  const end = start.plus({ days: view === "week" ? 7 : 1 });

  const db = await getDb();
  await sweepExpired(db, provider.id);
  const [rows, pending, services, grants] = await Promise.all([
    db.query<Row>(`${SELECT} where a.provider_id = $1 and a.status in ('pending', 'confirmed') and a.starts_at < $3 and a.ends_at > $2 order by a.starts_at`, [provider.id, start.toJSDate(), end.toJSDate()]),
    db.query<Row>(`${SELECT} where a.provider_id = $1 and a.status = 'pending' and a.expires_at > now() order by a.starts_at`, [provider.id]),
    servicesFor(db, provider.id),
    listAccessGrants(db, provider),
  ]);
  const pendingGrants = grants.filter((g) => g.status === "pending");
  const activeGrants = grants.filter((g) => g.status === "approved" && g.expires_at && new Date(g.expires_at) > new Date());

  const qs = (d: DateTime, v = view) => `/dashboard?date=${d.toISODate()}&view=${v}`;
  const back = qs(picked);
  const step = view === "week" ? { weeks: 1 } : { days: 1 };
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => start.plus({ days: i }));

  const title = view === "week" ? t.weekOf(start.toFormat(f.weekOf)) : picked.hasSame(today, "day") ? t.today : cap(picked.toFormat("cccc"));
  const hidden = (id: string) => (<><input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={back} /></>);

  return (
    <div>
      <Flash sp={sp} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
          <p className="text-[15px] text-muted">{view === "week" ? `${start.toFormat(f.rangeStart)} – ${end.minus({ days: 1 }).toFormat(f.rangeEnd)}` : picked.toFormat(f.day)} · {zone.replace(/_/g, " ")}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={qs(picked.minus(step))} className={`${btnSmall} w-11 px-0`} aria-label={view === "week" ? t.prevWeek : t.prevDay}>
            <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2"><path d="M7 1L1 7l6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link href={qs(today)} className={btnSmall}>{t.today}</Link>
          <Link href={qs(picked.plus(step))} className={`${btnSmall} w-11 px-0`} aria-label={view === "week" ? t.nextWeek : t.nextDay}>
            <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link href={qs(picked, view === "week" ? "day" : "week")} className={btnSmall}>{view === "week" ? t.day : t.week}</Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <details className="group col-span-2 open:rounded-2xl open:border open:border-line open:p-4 sm:col-span-1">
          <summary className={`${btnSmallAccent} w-full cursor-pointer group-open:mb-3 group-open:justify-start group-open:bg-transparent group-open:px-0 group-open:text-base group-open:text-ink group-open:hover:bg-transparent`}>{t.addAppointment}</summary>
          <form action={addAppointmentAction} className="space-y-3">
            <input type="hidden" name="back" value={back} />
            <div><label className={label} htmlFor="aa-svc">{t.service}</label>
              <select id="aa-svc" name="serviceId" className={input} required>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({fmtDuration(s.duration_minutes, locale)})</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label} htmlFor="aa-date">{t.date}</label><input id="aa-date" type="date" name="date" defaultValue={picked.toISODate()!} className={input} required /></div>
              <div><label className={label} htmlFor="aa-time">{t.time}</label><input id="aa-time" type="time" name="time" defaultValue="10:00" className={input} required /></div>
            </div>
            <div><label className={label} htmlFor="aa-name">{t.clientName}</label><input id="aa-name" name="name" className={input} required maxLength={100} /></div>
            <div><label className={label} htmlFor="aa-email">{t.clientEmail}</label><input id="aa-email" name="email" type="email" className={input} required /></div>
            <div><label className={label} htmlFor="aa-phone">{t.phone} <span className="font-normal text-muted">({dict.common.optional})</span></label><input id="aa-phone" name="phone" type="tel" className={input} /></div>
            <label className="flex min-h-11 items-center gap-2 text-[15px]"><input type="checkbox" name="notify" defaultChecked className="h-5 w-5 shrink-0 accent-accent" /> {t.notify}</label>
            <p className="text-sm text-muted">{t.manualHint}</p>
            <button className={`${btnSmallAccent} w-full`}>{t.addAppointment}</button>
          </form>
        </details>
        <details className="group col-span-2 open:rounded-2xl open:border open:border-line open:p-4 sm:col-span-1">
          <summary className={`${btnSmall} w-full cursor-pointer group-open:mb-3 group-open:justify-start group-open:border-0 group-open:px-0 group-open:text-base`}>{t.blockTime}</summary>
          <form action={blockTimeAction} className="space-y-3">
            <input type="hidden" name="back" value={back} />
            <div><label className={label} htmlFor="bt-date">{t.date}</label><input id="bt-date" type="date" name="date" defaultValue={picked.toISODate()!} className={input} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label} htmlFor="bt-start">{t.from}</label><input id="bt-start" type="time" name="start" defaultValue="12:00" className={input} required /></div>
              <div><label className={label} htmlFor="bt-end">{t.until}</label><input id="bt-end" type="time" name="end" defaultValue="13:00" className={input} required /></div>
            </div>
            <div><label className={label} htmlFor="bt-title">{t.blockLabel} <span className="font-normal text-muted">({t.private})</span></label><input id="bt-title" name="title" className={input} placeholder={t.blockPlaceholder} maxLength={80} /></div>
            <button className={`${btnSmallAccent} w-full`}>{t.blockSubmit}</button>
            <p className="text-sm text-muted">{t.blockHintBefore}<Link className="font-medium text-accent hover:underline" href="/dashboard/settings#dates">{t.blockHintLink}</Link>{t.blockHintAfter}</p>
          </form>
        </details>
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="pending-title" className="mt-8">
          <h2 id="pending-title" className="text-[13px] font-semibold uppercase tracking-wide text-warn">{t.pendingTitle(pending.length)}</h2>
          <p className="mt-1 text-sm text-muted">{t.pendingHint}</p>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{r.client_name} <span className="font-normal text-muted">· {r.service_name}</span></p>
                  <p className="text-[15px]">{fmtDate(r.starts_at, zone, locale)}, {fmtTime(r.starts_at, zone, locale)} – {fmtTime(r.ends_at, zone, locale)}</p>
                  <p className="text-sm text-muted">{t.expires(fmtDate(r.expires_at!, zone, locale), fmtTime(r.expires_at!, zone, locale))}</p>
                  {r.client_note && <p className="mt-1 break-words text-[15px] text-muted">&ldquo;{r.client_note}&rdquo;</p>}
                </div>
                <div className="flex gap-2">
                  <form action={approveAction}>{hidden(r.id)}<button className={btnSmallAccent}>{t.approve}</button></form>
                  <form action={declineAction}>{hidden(r.id)}<button className={btnSmall}>{t.decline}</button></form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingGrants.length > 0 && (
        <section aria-labelledby="access-title" className="mt-8">
          <h2 id="access-title" className="text-[13px] font-semibold uppercase tracking-wide text-accent">{t.accessTitle(pendingGrants.length)}</h2>
          <p className="mt-1 text-sm text-muted">{t.accessHint(provider.access_link_days)}</p>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {pendingGrants.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{g.name} <span className="font-normal text-muted">{g.email}</span></p>
                  {g.message && <p className="mt-1 break-words text-[15px] text-muted">&ldquo;{g.message}&rdquo;</p>}
                </div>
                <div className="flex gap-2">
                  <form action={approveAccessAction}>{hidden(g.id)}<button className={btnSmallAccent}>{t.approve}</button></form>
                  <form action={declineAccessAction}>{hidden(g.id)}<button className={btnSmall}>{t.decline}</button></form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 space-y-8">
        {days.map((d) => {
          const dayRows = rows.filter((r) => DateTime.fromJSDate(new Date(r.starts_at)).setZone(zone).hasSame(d, "day"));
          return (
            <section key={d.toISODate()} aria-label={cap(d.toFormat(f.dayLong))}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                {view === "week" ? <Link href={qs(d, "day")} className="hover:text-accent">{d.toFormat(f.dayLink)}</Link> : t.appointments}
              </h2>
              {dayRows.length === 0 ? (
                <p className="mt-2 border-y border-line py-6 text-center text-[15px] text-muted">{t.nothingBooked}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {dayRows.map((r) => <Item key={r.id} r={r} provider={provider} back={back} t={t} locale={locale} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {activeGrants.length > 0 && (
        <section aria-labelledby="links-title" className="mt-10">
          <h2 id="links-title" className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t.activeLinks}</h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {activeGrants.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0 break-words"><strong className="font-semibold">{g.name}</strong> <span className="text-sm text-muted">{t.untilDate(fmtDate(g.expires_at!, zone, locale))}</span></span>
                <span className="flex gap-2">
                  <CopyButton text={accessLink(provider, g.id)} className={btnSmall} />
                  <form action={revokeAccessAction}>{hidden(g.id)}<button className={btnDanger}>{t.turnOff}</button></form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ r, provider, back, t, locale }: { r: Row; provider: Provider; back: string; t: Dict["dashboard"]["schedule"]; locale: Locale }) {
  const zone = provider.timezone;
  const localDate = DateTime.fromJSDate(new Date(r.starts_at)).setZone(zone);
  if (r.kind === "block") {
    return (
      <li className="flex items-center gap-4 py-3">
        <span className="w-[4.5rem] shrink-0 text-[15px] tabular-nums text-muted">{fmtTime(r.starts_at, zone, locale)}</span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-medium text-muted">{r.title || t.blocked}</span>
          <span className="block text-sm text-muted">{t.blockedUntil(fmtTime(r.ends_at, zone, locale))}</span>
        </span>
        <form action={cancelAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} /><button className={btnSmall}>{t.unblock}</button></form>
      </li>
    );
  }
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer items-start gap-4 py-3 hover:bg-canvas sm:-mx-3 sm:rounded-xl sm:px-3">
          <span className="w-[4.5rem] shrink-0 pt-px text-[15px] font-semibold tabular-nums">{fmtTime(r.starts_at, zone, locale)}</span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold">{r.client_name}</span>
            <span className="block break-words text-sm text-muted">{r.service_name} · {t.untilTime(fmtTime(r.ends_at, zone, locale))}</span>
          </span>
          <span className={`shrink-0 pt-px text-[13px] font-semibold ${r.status === "pending" ? "text-warn" : "text-ok"}`}>
            {r.status === "pending" ? t.pending : t.confirmed}
          </span>
        </summary>
        <div className="mb-3 space-y-3 rounded-xl bg-canvas p-4 text-[15px]">
          <p className="break-words">{r.client_email}{r.client_phone && ` · ${r.client_phone}`} · <Link className="font-medium text-accent hover:underline" href={`/dashboard/clients/${r.client_id}`}>{t.clientHistory}</Link></p>
          {r.client_note && <p className="break-words">&ldquo;{r.client_note}&rdquo;</p>}
          <form action={rescheduleAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} />
            <label className="text-sm text-muted">{t.newDate}<input type="date" name="date" defaultValue={localDate.toISODate()!} className={`${input} min-h-11`} required /></label>
            <label className="text-sm text-muted">{t.time}<input type="time" name="time" defaultValue={localDate.toFormat("HH:mm")} className={`${input} min-h-11`} required /></label>
            <button className={btnSmall}>{t.reschedule}</button>
          </form>
          <form action={cancelAction}>
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} />
            <button className={btnDanger}>{t.cancelAppointment}</button>
          </form>
        </div>
      </details>
    </li>
  );
}

/** Luxon gives Russian day names in lower case; a heading starts with a capital. */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
