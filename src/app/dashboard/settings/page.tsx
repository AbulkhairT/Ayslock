import { DateTime } from "luxon";
import { getDb } from "@/lib/db";
import { fmtDuration, minutesToHHMM } from "@/lib/format";
import { toDayHours } from "@/lib/hours";
import { exceptionRows, servicesFor, weeklyHours } from "@/lib/providers";
import { requireProvider } from "@/lib/session";
import { HoursEditor } from "@/components/HoursEditor";
import { ZoneField } from "@/components/ZoneField";
import { btnDanger, btnSmall, btnSmallAccent, hint, input, label, textarea } from "@/components/ui";
import {
  addException, addService, deleteService, removeException, saveHours, saveProfile, saveRules, updateService,
} from "../actions";
import { Flash } from "../Flash";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Ayslock" };

const MODES = [
  { v: "open", t: "Open", d: "Anyone with your username or link sees your times and books instantly." },
  { v: "approval", t: "Approval required", d: "Clients see your times and send a request. It's pending (and holds the slot) until you approve or it expires." },
  { v: "private", t: "Private", d: "Your profile is visible by exact username, but times are hidden. Clients ask for access; you approve and they get an expiring private link." },
];

const NOTICE = [[0, "No minimum"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"], [720, "12 hours"], [1440, "1 day"], [2880, "2 days"], [10080, "1 week"]] as const;

const section = "border-t border-line pt-6";

export default async function Settings({ searchParams }: PageProps<"/dashboard/settings">) {
  const p = await requireProvider();
  const sp = await searchParams;
  const db = await getDb();
  const today = DateTime.now().setZone(p.timezone).toISODate()!;
  const [services, weekly, exceptions] = await Promise.all([
    servicesFor(db, p.id, false),
    weeklyHours(db, p.id),
    exceptionRows(db, p.id, today, DateTime.fromISO(today).plus({ years: 1 }).toISODate()!),
  ]);
  const back = "/dashboard/settings";
  const hidden = <input type="hidden" name="back" value={back} />;

  return (
    <div className="space-y-10">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Settings</h1>
      <Flash sp={sp} />

      <section id="booking" className={section} aria-labelledby="booking-title">
        <h2 id="booking-title" className="text-lg font-semibold">Who can book, and when</h2>
        <form action={saveRules} className="mt-4 space-y-5">
          {hidden}
          <fieldset className="space-y-2">
            <legend className={label}>Booking access</legend>
            {MODES.map((m) => (
              <label key={m.v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="access_mode" value={m.v} defaultChecked={p.access_mode === m.v} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
                <span><span className="block font-semibold">{m.t}</span><span className="block text-sm text-muted">{m.d}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="min_notice_minutes" className={label}>Minimum notice</label>
              <select id="min_notice_minutes" name="min_notice_minutes" defaultValue={String(p.min_notice_minutes)} className={input}>
                {!NOTICE.some(([v]) => v === p.min_notice_minutes) && <option value={p.min_notice_minutes}>{p.min_notice_minutes} minutes</option>}
                {NOTICE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
              <p className={hint}>How soon before a slot clients can still book it.</p>
            </div>
            <div>
              <label htmlFor="horizon_days" className={label}>Booking window (days ahead)</label>
              <input id="horizon_days" name="horizon_days" type="number" min={1} max={365} defaultValue={p.horizon_days} className={input} />
            </div>
            <div>
              <label htmlFor="buffer_minutes" className={label}>Buffer between appointments</label>
              <select id="buffer_minutes" name="buffer_minutes" defaultValue={String(p.buffer_minutes)} className={input}>
                {[0, 5, 10, 15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v ? `${v} minutes` : "None"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pending_expiry_hours" className={label}>Hold requests for (hours)</label>
              <input id="pending_expiry_hours" name="pending_expiry_hours" type="number" min={1} max={168} defaultValue={p.pending_expiry_hours} className={input} />
              <p className={hint}>Approval mode: unanswered requests expire and free the slot.</p>
            </div>
            <div>
              <label htmlFor="access_link_days" className={label}>Private links last (days)</label>
              <input id="access_link_days" name="access_link_days" type="number" min={1} max={365} defaultValue={p.access_link_days} className={input} />
            </div>
          </div>
          <button className={btnSmallAccent}>Save booking settings</button>
        </form>
      </section>

      <section id="services" className={section} aria-labelledby="services-title">
        <h2 id="services-title" className="text-lg font-semibold">Services</h2>
        <ul className="mt-3 space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <details className="rounded-xl border border-line p-4">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                  <span><span className="font-semibold">{s.name}</span> <span className="text-sm text-muted">· {fmtDuration(s.duration_minutes)}{s.price_cents != null && ` · ${(s.price_cents / 100).toFixed(2)} ${s.currency}`}</span></span>
                  {!s.active && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">Hidden</span>}
                </summary>
                <form action={updateService} className="mt-3 grid gap-3 sm:grid-cols-2">
                  {hidden}<input type="hidden" name="id" value={s.id} />
                  <div className="sm:col-span-2"><label className={label} htmlFor={`n-${s.id}`}>Name</label><input id={`n-${s.id}`} name="name" defaultValue={s.name} className={input} required maxLength={80} /></div>
                  <div><label className={label} htmlFor={`d-${s.id}`}>Minutes</label><input id={`d-${s.id}`} name="duration_minutes" type="number" min={5} max={720} defaultValue={s.duration_minutes} className={input} /></div>
                  <div><label className={label} htmlFor={`p-${s.id}`}>Price ({s.currency}, optional)</label><input id={`p-${s.id}`} name="price" inputMode="decimal" defaultValue={s.price_cents != null ? (s.price_cents / 100).toString() : ""} className={input} /></div>
                  <div className="sm:col-span-2"><label className={label} htmlFor={`desc-${s.id}`}>Description</label><input id={`desc-${s.id}`} name="description" defaultValue={s.description} className={input} maxLength={300} /></div>
                  <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="h-5 w-5" /> Clients can book this</label>
                  <div className="flex gap-2 sm:col-span-2"><button className={btnSmallAccent}>Save</button></div>
                </form>
                <form action={deleteService} className="mt-2">{hidden}<input type="hidden" name="id" value={s.id} /><button className={btnDanger}>Delete service</button></form>
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-xl border border-dashed border-line p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-accent">+ Add a service</summary>
          <form action={addService} className="mt-3 grid gap-3 sm:grid-cols-2">
            {hidden}
            <div className="sm:col-span-2"><label className={label} htmlFor="ns-name">Name</label><input id="ns-name" name="name" className={input} required maxLength={80} /></div>
            <div><label className={label} htmlFor="ns-dur">Minutes</label><input id="ns-dur" name="duration_minutes" type="number" min={5} max={720} defaultValue={30} className={input} /></div>
            <div><label className={label} htmlFor="ns-price">Price (optional)</label><input id="ns-price" name="price" inputMode="decimal" className={input} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="ns-desc">Description (optional)</label><input id="ns-desc" name="description" className={input} maxLength={300} /></div>
            <div><button className={btnSmallAccent}>Add service</button></div>
          </form>
        </details>
      </section>

      <section id="hours" className={section} aria-labelledby="hours-title">
        <h2 id="hours-title" className="text-lg font-semibold">Weekly hours</h2>
        <p className="mb-3 text-sm text-muted">In {p.timezone.replace(/_/g, " ")}. Breaks are never offered to clients.</p>
        <form action={saveHours} className="space-y-3">
          {hidden}
          <HoursEditor initial={toDayHours(weekly, minutesToHHMM)} />
          <button className={btnSmallAccent}>Save hours</button>
        </form>
      </section>

      <section id="dates" className={section} aria-labelledby="dates-title">
        <h2 id="dates-title" className="text-lg font-semibold">Days off and special hours</h2>
        <p className="mb-3 text-sm text-muted">These replace your weekly hours for that date. Existing appointments stay; cancel them from your schedule if needed.</p>
        {exceptions.length > 0 && (
          <ul className="mb-4 divide-y divide-line">
            {exceptions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{DateTime.fromISO(e.date).toFormat("ccc, LLL d, yyyy")}</span>{" "}
                  <span className="text-sm text-muted">{e.start_minute == null ? "Closed" : `${minutesToHHMM(e.start_minute)}–${minutesToHHMM(e.end_minute!)}`}{e.note && ` · ${e.note}`}</span>
                </span>
                <form action={removeException}>{hidden}<input type="hidden" name="id" value={e.id} /><button className={btnSmall}>Remove</button></form>
              </li>
            ))}
          </ul>
        )}
        <form action={addException} className="grid gap-3 sm:grid-cols-2">
          {hidden}
          <div><label className={label} htmlFor="ex-date">Date</label><input id="ex-date" name="date" type="date" min={today} className={input} required /></div>
          <div>
            <label className={label} htmlFor="ex-kind">Type</label>
            <select id="ex-kind" name="kind" className={input}><option value="closed">Closed all day</option><option value="hours">Special hours</option></select>
          </div>
          <div><label className={label} htmlFor="ex-start">From (special hours)</label><input id="ex-start" name="start" type="time" defaultValue="10:00" className={input} /></div>
          <div><label className={label} htmlFor="ex-end">Until</label><input id="ex-end" name="end" type="time" defaultValue="14:00" className={input} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="ex-note">Note (private)</label><input id="ex-note" name="note" className={input} maxLength={100} placeholder="Holiday" /></div>
          <div><button className={btnSmallAccent}>Add date</button></div>
        </form>
      </section>

      <section id="profile" className={section} aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-lg font-semibold">Profile</h2>
        <form action={saveProfile} className="mt-4 space-y-4">
          {hidden}
          <div><label className={label} htmlFor="display_name">Name</label><input id="display_name" name="display_name" defaultValue={p.display_name} className={input} required maxLength={80} /></div>
          <div>
            <label className={label} htmlFor="username">Username</label>
            <input id="username" name="username" defaultValue={p.username} className={input} required maxLength={30} autoCapitalize="none" />
            <p className={hint}>Changing it breaks links you already shared.</p>
          </div>
          <ZoneField name="timezone" initial={p.timezone} />
          <div><label className={label} htmlFor="bio">Bio</label><textarea id="bio" name="bio" rows={3} defaultValue={p.bio} className={textarea} maxLength={500} /></div>
          <div>
            <label className={label} htmlFor="location_kind">Appointments are</label>
            <select id="location_kind" name="location_kind" defaultValue={p.location_kind} className={input}><option value="in_person">In person</option><option value="online">Online</option></select>
          </div>
          <div><label className={label} htmlFor="location_text">Address or meeting details</label><input id="location_text" name="location_text" defaultValue={p.location_text} className={input} maxLength={200} /></div>
          <div><label className={label} htmlFor="avatar_url">Photo link (https, optional)</label><input id="avatar_url" name="avatar_url" type="url" defaultValue={p.avatar_url ?? ""} className={input} placeholder="https://…" /></div>
          <button className={btnSmallAccent}>Save profile</button>
        </form>
      </section>
    </div>
  );
}
