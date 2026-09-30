import { DateTime } from "luxon";
import { getDb } from "@/lib/db";
import { fmtDuration, fmtPrice, minutesToHHMM } from "@/lib/format";
import { toDayHours } from "@/lib/hours";
import { exceptionRows, servicesFor, weeklyHours } from "@/lib/providers";
import { requireProvider } from "@/lib/session";
import { getT } from "@/i18n/server";
import { HoursEditor } from "@/components/HoursEditor";
import { ZoneField } from "@/components/ZoneField";
import { btnDanger, btnSmall, btnSmallAccent, hint, input, label, textarea } from "@/components/ui";
import {
  addException, addService, deleteService, removeException, saveHours, saveProfile, saveRules, updateService,
} from "../actions";
import { Flash } from "../Flash";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: (await getT()).dashboard.settings.metaTitle };
}

const MODES = ["open", "approval", "private"] as const;

const NOTICE = [0, 30, 60, 120, 240, 720, 1440, 2880, 10080] as const;

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
  const { locale, dashboard, common } = await getT();
  const t = dashboard.settings;
  const noticeLabel = (v: number) =>
    v === 0 ? t.noMinimum : v === 10080 ? t.week : v % 1440 === 0 ? t.days(v / 1440) : v % 60 === 0 ? t.hours(v / 60) : t.minutes(v);
  const back = "/dashboard/settings";
  const hidden = <input type="hidden" name="back" value={back} />;

  return (
    <div className="space-y-10">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <Flash sp={sp} />

      <section id="booking" className={section} aria-labelledby="booking-title">
        <h2 id="booking-title" className="text-lg font-semibold">{t.bookingTitle}</h2>
        <form action={saveRules} className="mt-4 space-y-5">
          {hidden}
          <fieldset className="space-y-2">
            <legend className={label}>{t.access}</legend>
            {MODES.map((v) => ({ v, ...t.modes[v] })).map((m) => (
              <label key={m.v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="access_mode" value={m.v} defaultChecked={p.access_mode === m.v} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
                <span><span className="block font-semibold">{m.t}</span><span className="block text-sm text-muted">{m.d}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="min_notice_minutes" className={label}>{t.minNotice}</label>
              <select id="min_notice_minutes" name="min_notice_minutes" defaultValue={String(p.min_notice_minutes)} className={input}>
                {!NOTICE.some((v) => v === p.min_notice_minutes) && <option value={p.min_notice_minutes}>{t.minutes(p.min_notice_minutes)}</option>}
                {NOTICE.map((v) => <option key={v} value={v}>{noticeLabel(v)}</option>)}
              </select>
              <p className={hint}>{t.minNoticeHint}</p>
            </div>
            <div>
              <label htmlFor="horizon_days" className={label}>{t.horizon}</label>
              <input id="horizon_days" name="horizon_days" type="number" min={1} max={365} defaultValue={p.horizon_days} className={input} />
            </div>
            <div>
              <label htmlFor="buffer_minutes" className={label}>{t.buffer}</label>
              <select id="buffer_minutes" name="buffer_minutes" defaultValue={String(p.buffer_minutes)} className={input}>
                {[0, 5, 10, 15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v ? t.minutes(v) : t.none}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pending_expiry_hours" className={label}>{t.hold}</label>
              <input id="pending_expiry_hours" name="pending_expiry_hours" type="number" min={1} max={168} defaultValue={p.pending_expiry_hours} className={input} />
              <p className={hint}>{t.holdHint}</p>
            </div>
            <div>
              <label htmlFor="access_link_days" className={label}>{t.linkDays}</label>
              <input id="access_link_days" name="access_link_days" type="number" min={1} max={365} defaultValue={p.access_link_days} className={input} />
            </div>
          </div>
          <button className={btnSmallAccent}>{t.saveRules}</button>
        </form>
      </section>

      <section id="services" className={section} aria-labelledby="services-title">
        <h2 id="services-title" className="text-lg font-semibold">{t.services}</h2>
        <ul className="mt-3 space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <details className="rounded-xl border border-line p-4">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                  <span><span className="font-semibold">{s.name}</span> <span className="text-sm text-muted">· {fmtDuration(s.duration_minutes, locale)}{s.price_cents != null && ` · ${locale === "en" ? `${(s.price_cents / 100).toFixed(2)} ${s.currency}` : fmtPrice(s.price_cents, s.currency, locale)}`}</span></span>
                  {!s.active && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">{t.hidden}</span>}
                </summary>
                <form action={updateService} className="mt-3 grid gap-3 sm:grid-cols-2">
                  {hidden}<input type="hidden" name="id" value={s.id} />
                  <div className="sm:col-span-2"><label className={label} htmlFor={`n-${s.id}`}>{t.name}</label><input id={`n-${s.id}`} name="name" defaultValue={s.name} className={input} required maxLength={80} /></div>
                  <div><label className={label} htmlFor={`d-${s.id}`}>{t.minutesLabel}</label><input id={`d-${s.id}`} name="duration_minutes" type="number" min={5} max={720} defaultValue={s.duration_minutes} className={input} /></div>
                  <div><label className={label} htmlFor={`p-${s.id}`}>{t.priceIn(s.currency)}</label><input id={`p-${s.id}`} name="price" inputMode="decimal" defaultValue={s.price_cents != null ? (s.price_cents / 100).toString() : ""} className={input} /></div>
                  <div className="sm:col-span-2"><label className={label} htmlFor={`desc-${s.id}`}>{t.description}</label><input id={`desc-${s.id}`} name="description" defaultValue={s.description} className={input} maxLength={300} /></div>
                  <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="h-5 w-5" /> {t.bookable}</label>
                  <div className="flex gap-2 sm:col-span-2"><button className={btnSmallAccent}>{common.save}</button></div>
                </form>
                <form action={deleteService} className="mt-2">{hidden}<input type="hidden" name="id" value={s.id} /><button className={btnDanger}>{t.deleteService}</button></form>
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-xl border border-dashed border-line p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-accent">{t.addService}</summary>
          <form action={addService} className="mt-3 grid gap-3 sm:grid-cols-2">
            {hidden}
            <div className="sm:col-span-2"><label className={label} htmlFor="ns-name">{t.name}</label><input id="ns-name" name="name" className={input} required maxLength={80} /></div>
            <div><label className={label} htmlFor="ns-dur">{t.minutesLabel}</label><input id="ns-dur" name="duration_minutes" type="number" min={5} max={720} defaultValue={30} className={input} /></div>
            <div><label className={label} htmlFor="ns-price">{t.priceOptional}</label><input id="ns-price" name="price" inputMode="decimal" className={input} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="ns-desc">{t.descriptionOptional}</label><input id="ns-desc" name="description" className={input} maxLength={300} /></div>
            <div><button className={btnSmallAccent}>{t.addServiceSubmit}</button></div>
          </form>
        </details>
      </section>

      <section id="hours" className={section} aria-labelledby="hours-title">
        <h2 id="hours-title" className="text-lg font-semibold">{t.weeklyHours}</h2>
        <p className="mb-3 text-sm text-muted">{t.hoursLead(p.timezone.replace(/_/g, " "))}</p>
        <form action={saveHours} className="space-y-3">
          {hidden}
          <HoursEditor initial={toDayHours(weekly, minutesToHHMM)} />
          <button className={btnSmallAccent}>{t.saveHours}</button>
        </form>
      </section>

      <section id="dates" className={section} aria-labelledby="dates-title">
        <h2 id="dates-title" className="text-lg font-semibold">{t.datesTitle}</h2>
        <p className="mb-3 text-sm text-muted">{t.datesLead}</p>
        {exceptions.length > 0 && (
          <ul className="mb-4 divide-y divide-line">
            {exceptions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{DateTime.fromISO(e.date, { locale: locale === "ru" ? "ru" : "en-US" }).toFormat(t.dateFmt)}</span>{" "}
                  <span className="text-sm text-muted">{e.start_minute == null ? t.closed : `${minutesToHHMM(e.start_minute)}–${minutesToHHMM(e.end_minute!)}`}{e.note && ` · ${e.note}`}</span>
                </span>
                <form action={removeException}>{hidden}<input type="hidden" name="id" value={e.id} /><button className={btnSmall}>{t.remove}</button></form>
              </li>
            ))}
          </ul>
        )}
        <form action={addException} className="grid gap-3 sm:grid-cols-2">
          {hidden}
          <div><label className={label} htmlFor="ex-date">{t.date}</label><input id="ex-date" name="date" type="date" min={today} className={input} required /></div>
          <div>
            <label className={label} htmlFor="ex-kind">{t.type}</label>
            <select id="ex-kind" name="kind" className={input}><option value="closed">{t.closedAllDay}</option><option value="hours">{t.specialHours}</option></select>
          </div>
          <div><label className={label} htmlFor="ex-start">{t.fromSpecial}</label><input id="ex-start" name="start" type="time" defaultValue="10:00" className={input} /></div>
          <div><label className={label} htmlFor="ex-end">{t.until}</label><input id="ex-end" name="end" type="time" defaultValue="14:00" className={input} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="ex-note">{t.note}</label><input id="ex-note" name="note" className={input} maxLength={100} placeholder={t.notePlaceholder} /></div>
          <div><button className={btnSmallAccent}>{t.addDate}</button></div>
        </form>
      </section>

      <section id="profile" className={section} aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-lg font-semibold">{t.profile}</h2>
        <form action={saveProfile} className="mt-4 space-y-4">
          {hidden}
          <div><label className={label} htmlFor="display_name">{t.name}</label><input id="display_name" name="display_name" defaultValue={p.display_name} className={input} required maxLength={80} /></div>
          <div>
            <label className={label} htmlFor="username">{t.username}</label>
            <input id="username" name="username" defaultValue={p.username} className={input} required maxLength={30} autoCapitalize="none" />
            <p className={hint}>{t.usernameHint}</p>
          </div>
          <div><label className={label} htmlFor="profession">{t.profession}</label><input id="profession" name="profession" defaultValue={p.profession} className={input} maxLength={60} placeholder={t.professionPlaceholder} /></div>
          <div>
            <label className="flex min-h-11 items-start gap-3">
              <input type="checkbox" name="listed" defaultChecked={p.listed} className="mt-1 h-5 w-5 shrink-0 accent-accent" />
              <span>
                <span className="font-medium">{t.listed}</span>
                <span className={`block ${hint}`}>{t.listedHint}</span>
              </span>
            </label>
            <input type="hidden" name="listed" value="off" />
          </div>
          <ZoneField name="timezone" initial={p.timezone} />
          <div><label className={label} htmlFor="bio">{t.bio}</label><textarea id="bio" name="bio" rows={3} defaultValue={p.bio} className={textarea} maxLength={500} /></div>
          <div>
            <label className={label} htmlFor="location_kind">{t.locationKind}</label>
            <select id="location_kind" name="location_kind" defaultValue={p.location_kind} className={input}><option value="in_person">{t.inPerson}</option><option value="online">{t.online}</option></select>
          </div>
          <div><label className={label} htmlFor="location_text">{t.location}</label><input id="location_text" name="location_text" defaultValue={p.location_text} className={input} maxLength={200} /></div>
          <div><label className={label} htmlFor="avatar_url">{t.photo}</label><input id="avatar_url" name="avatar_url" type="url" defaultValue={p.avatar_url ?? ""} className={input} placeholder="https://…" /></div>
          <button className={btnSmallAccent}>{t.saveProfile}</button>
        </form>
      </section>
    </div>
  );
}
