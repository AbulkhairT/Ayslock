import { DateTime } from "luxon";
import Link from "next/link";
import { accessLink, listAccessGrants } from "@/lib/access";
import { sweepExpired } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDuration, fmtTime } from "@/lib/format";
import { servicesFor } from "@/lib/providers";
import { requireProvider } from "@/lib/session";
import type { Provider } from "@/lib/types";
import { CopyButton } from "@/components/CopyButton";
import { btnDanger, btnSmall, btnSmallAccent, input, label } from "@/components/ui";
import {
  addAppointmentAction, approveAccessAction, approveAction, blockTimeAction, cancelAction, declineAccessAction, declineAction,
  revokeAccessAction, rescheduleAction,
} from "./actions";
import { Flash } from "./Flash";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule · Ayslock" };

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
  const zone = provider.timezone;
  const today = DateTime.now().setZone(zone).startOf("day");
  const view = sp.view === "week" ? "week" : "day";
  const picked = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? DateTime.fromISO(sp.date, { zone }) : today;
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

  return (
    <div>
      <Flash sp={sp} />

      {pending.length > 0 && (
        <section aria-labelledby="pending-title" className="mb-6 rounded-3xl border border-warn/30 bg-warn-soft p-5">
          <h2 id="pending-title" className="text-lg font-bold text-warn">Waiting for you ({pending.length})</h2>
          <p className="mb-3 text-sm text-warn">These times are held until they expire. Approve or decline.</p>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-4">
                <p className="font-semibold">{r.client_name} · {r.service_name}</p>
                <p className="text-sm">{fmtDate(r.starts_at, zone)}, {fmtTime(r.starts_at, zone)} – {fmtTime(r.ends_at, zone)}</p>
                <p className="text-xs text-muted">Expires {fmtDate(r.expires_at!, zone)} at {fmtTime(r.expires_at!, zone)}</p>
                {r.client_note && <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm">&ldquo;{r.client_note}&rdquo;</p>}
                <div className="mt-3 flex gap-2">
                  <form action={approveAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} /><button className={btnSmallAccent}>Approve</button></form>
                  <form action={declineAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} /><button className={btnSmall}>Decline</button></form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingGrants.length > 0 && (
        <section aria-labelledby="access-title" className="mb-6 rounded-3xl border border-accent/20 bg-accent-soft p-5">
          <h2 id="access-title" className="text-lg font-bold text-accent-strong">Access requests ({pendingGrants.length})</h2>
          <p className="mb-3 text-sm text-accent-strong">Approving emails them a private link that shows your times for {provider.access_link_days} days.</p>
          <ul className="space-y-3">
            {pendingGrants.map((g) => (
              <li key={g.id} className="rounded-2xl bg-white p-4">
                <p className="font-semibold">{g.name} <span className="font-normal text-muted">{g.email}</span></p>
                {g.message && <p className="mt-1 text-sm">&ldquo;{g.message}&rdquo;</p>}
                <div className="mt-3 flex gap-2">
                  <form action={approveAccessAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="back" value={back} /><button className={btnSmallAccent}>Approve</button></form>
                  <form action={declineAccessAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="back" value={back} /><button className={btnSmall}>Decline</button></form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {view === "week" ? `Week of ${start.toFormat("LLL d")}` : picked.hasSame(today, "day") ? "Today" : picked.toFormat("cccc")}
          </h1>
          <p className="text-sm text-muted">{view === "week" ? `${start.toFormat("LLL d")} – ${end.minus({ days: 1 }).toFormat("LLL d, yyyy")}` : picked.toFormat("LLLL d, yyyy")} · {zone.replace(/_/g, " ")}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={qs(picked.minus(step))} className={btnSmall} aria-label="Previous">←</Link>
          <Link href={qs(today)} className={btnSmall}>Today</Link>
          <Link href={qs(picked.plus(step))} className={btnSmall} aria-label="Next">→</Link>
          <Link href={qs(picked, view === "week" ? "day" : "week")} className={btnSmall}>{view === "week" ? "Day" : "Week"}</Link>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((d) => {
          const dayRows = rows.filter((r) => DateTime.fromJSDate(new Date(r.starts_at)).setZone(zone).hasSame(d, "day"));
          return (
            <section key={d.toISODate()} aria-label={d.toFormat("cccc, LLLL d")} className="rounded-3xl border border-line bg-white p-4 sm:p-5">
              {view === "week" && (
                <h2 className="mb-2 font-bold">
                  <Link href={qs(d, "day")} className="hover:text-accent">{d.toFormat("cccc, LLL d")}</Link>
                </h2>
              )}
              {dayRows.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Nothing booked.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {dayRows.map((r) => <Item key={r.id} r={r} provider={provider} back={back} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <details className="rounded-3xl border border-line bg-white p-5">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">+ Add appointment</summary>
          <form action={addAppointmentAction} className="mt-3 space-y-3">
            <input type="hidden" name="back" value={back} />
            <div><label className={label} htmlFor="aa-svc">Service</label>
              <select id="aa-svc" name="serviceId" className={input} required>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({fmtDuration(s.duration_minutes)})</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label} htmlFor="aa-date">Date</label><input id="aa-date" type="date" name="date" defaultValue={picked.toISODate()!} className={input} required /></div>
              <div><label className={label} htmlFor="aa-time">Time</label><input id="aa-time" type="time" name="time" defaultValue="10:00" className={input} required /></div>
            </div>
            <div><label className={label} htmlFor="aa-name">Client name</label><input id="aa-name" name="name" className={input} required maxLength={100} /></div>
            <div><label className={label} htmlFor="aa-email">Client email</label><input id="aa-email" name="email" type="email" className={input} required /></div>
            <div><label className={label} htmlFor="aa-phone">Phone <span className="font-normal text-muted">(optional)</span></label><input id="aa-phone" name="phone" type="tel" className={input} /></div>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="h-5 w-5" /> Email the client a confirmation</label>
            <p className="text-xs text-muted">Manual appointments can go outside your hours, but never overlap another booking.</p>
            <button className={`${btnSmallAccent} w-full`}>Add appointment</button>
          </form>
        </details>
        <details className="rounded-3xl border border-line bg-white p-5">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">⛔ Block time</summary>
          <form action={blockTimeAction} className="mt-3 space-y-3">
            <input type="hidden" name="back" value={back} />
            <div><label className={label} htmlFor="bt-date">Date</label><input id="bt-date" type="date" name="date" defaultValue={picked.toISODate()!} className={input} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label} htmlFor="bt-start">From</label><input id="bt-start" type="time" name="start" defaultValue="12:00" className={input} required /></div>
              <div><label className={label} htmlFor="bt-end">Until</label><input id="bt-end" type="time" name="end" defaultValue="13:00" className={input} required /></div>
            </div>
            <div><label className={label} htmlFor="bt-title">Label <span className="font-normal text-muted">(private)</span></label><input id="bt-title" name="title" className={input} placeholder="Dentist" maxLength={80} /></div>
            <button className={`${btnSmallAccent} w-full`}>Block this time</button>
            <p className="text-xs text-muted">For whole days off or special hours, use <Link className="font-semibold text-accent" href="/dashboard/settings#dates">date exceptions</Link>.</p>
          </form>
        </details>
      </div>

      {activeGrants.length > 0 && (
        <section aria-labelledby="links-title" className="mt-6 rounded-3xl border border-line bg-white p-5">
          <h2 id="links-title" className="text-lg font-bold">Active private links</h2>
          <ul className="mt-2 divide-y divide-line">
            {activeGrants.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><strong>{g.name}</strong> <span className="text-sm text-muted">until {fmtDate(g.expires_at!, zone)}</span></span>
                <span className="flex gap-2">
                  <CopyButton text={accessLink(provider, g.id)} className={btnSmall} />
                  <form action={revokeAccessAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="back" value={back} /><button className={btnDanger}>Turn off</button></form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ r, provider, back }: { r: Row; provider: Provider; back: string }) {
  const zone = provider.timezone;
  const localDate = DateTime.fromJSDate(new Date(r.starts_at)).setZone(zone);
  if (r.kind === "block") {
    return (
      <li className="flex items-center justify-between gap-3 py-3">
        <div className="flex gap-4">
          <span className="w-20 shrink-0 text-sm font-semibold text-muted">{fmtTime(r.starts_at, zone)}</span>
          <span><span className="font-semibold">⛔ {r.title || "Blocked"}</span><span className="block text-sm text-muted">until {fmtTime(r.ends_at, zone)}</span></span>
        </div>
        <form action={cancelAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} /><button className={btnSmall}>Unblock</button></form>
      </li>
    );
  }
  return (
    <li className="py-3">
      <details>
        <summary className="flex cursor-pointer gap-4">
          <span className="w-20 shrink-0 text-sm font-semibold">{fmtTime(r.starts_at, zone)}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{r.client_name}</span>
            <span className="block text-sm text-muted">{r.service_name} · until {fmtTime(r.ends_at, zone)}</span>
          </span>
          <span className={`h-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === "pending" ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
            {r.status === "pending" ? "Pending" : "Confirmed"}
          </span>
        </summary>
        <div className="mt-3 space-y-3 rounded-2xl bg-canvas p-4 text-sm">
          <p>{r.client_email}{r.client_phone && ` · ${r.client_phone}`} · <Link className="font-semibold text-accent" href={`/dashboard/clients/${r.client_id}`}>Client history</Link></p>
          {r.client_note && <p>&ldquo;{r.client_note}&rdquo;</p>}
          <form action={rescheduleAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} />
            <label className="text-xs font-semibold text-muted">New date<input type="date" name="date" defaultValue={localDate.toISODate()!} className={`${input} min-h-11`} required /></label>
            <label className="text-xs font-semibold text-muted">Time<input type="time" name="time" defaultValue={localDate.toFormat("HH:mm")} className={`${input} min-h-11`} required /></label>
            <button className={btnSmall}>Reschedule</button>
          </form>
          <form action={cancelAction}>
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} />
            <button className={btnDanger}>Cancel appointment</button>
          </form>
        </div>
      </details>
    </li>
  );
}
