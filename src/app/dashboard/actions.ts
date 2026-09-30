"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveAccess, declineAccess, revokeAccess } from "@/lib/access";
import {
  addManualAppointment, approveRequest, blockTime, BookingError, cancelByProvider, declineRequest, rescheduleByProvider,
} from "@/lib/booking";
import { getDb, pgCode } from "@/lib/db";
import { hhmmToMinutes } from "@/lib/format";
import { parseHoursForm } from "@/lib/hours";
import { formObject, priceToCents, profileSchema, serviceSchema } from "@/lib/profile";
import { requireProvider } from "@/lib/session";
import { localToUtc } from "@/lib/slots";
import type { Provider } from "@/lib/types";
import { getDict, localizeError, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";

function backTo(form: FormData, fallback = "/dashboard") {
  const b = String(form.get("back") ?? "");
  return b.startsWith("/dashboard") ? b : fallback;
}

function go(path: string, msg: { ok?: string; err?: string }): never {
  const [base, query] = path.split("?");
  const qs = new URLSearchParams(query);
  qs.delete("ok");
  qs.delete("err");
  if (msg.ok) qs.set("ok", msg.ok);
  if (msg.err) qs.set("err", msg.err);
  revalidatePath("/dashboard", "layout");
  redirect(`${base}?${qs}`);
}

type T = ReturnType<typeof getDict>["dashboard"] & { locale: Locale };

/** Runs a dashboard change and comes back with a message in the provider's language. */
async function run(form: FormData, ok: (t: T) => string, fn: (p: Provider, t: T) => Promise<unknown>) {
  const provider = await requireProvider();
  const locale = await getLocale();
  const t: T = { ...getDict(locale).dashboard, locale };
  const back = backTo(form);
  try {
    await fn(provider, t);
  } catch (e) {
    if (e instanceof UserError) go(back, { err: e.message });
    if (e instanceof BookingError) go(back, { err: localizeError(e.message, locale) });
    if (e instanceof Error && /already handled/.test(e.message)) go(back, { err: localizeError(e.message, locale) });
    throw e;
  }
  go(back, { ok: ok(t) });
}

class UserError extends Error {}

function localInstant(p: Provider, t: T, date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError(t.errors.pickDate);
  const m = hhmmToMinutes(time);
  if (m == null) throw new UserError(t.errors.pickTime);
  const dt = localToUtc(date, m, p.timezone);
  if (!dt) throw new UserError(t.errors.dst);
  return dt.toJSDate();
}

const id = (f: FormData) => String(f.get("id") ?? "");

// ---- Schedule ----

export async function approveAction(f: FormData) {
  await run(f, (t) => t.flash.approved, (p) => approveRequest(p, id(f)));
}
export async function declineAction(f: FormData) {
  await run(f, (t) => t.flash.declined, (p) => declineRequest(p, id(f)));
}
export async function cancelAction(f: FormData) {
  await run(f, (t) => t.flash.cancelled, (p) => cancelByProvider(p, id(f), f.get("notify") !== "0"));
}
export async function rescheduleAction(f: FormData) {
  await run(f, (t) => t.flash.moved, (p, t) =>
    rescheduleByProvider(p, id(f), localInstant(p, t, String(f.get("date")), String(f.get("time")))),
  );
}
export async function addAppointmentAction(f: FormData) {
  await run(f, (t) => t.flash.added, async (p, t) => {
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    if (!name) throw new UserError(t.errors.clientName);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError(t.errors.clientEmail);
    await addManualAppointment(p, {
      serviceId: String(f.get("serviceId")),
      startsAt: localInstant(p, t, String(f.get("date")), String(f.get("time"))),
      name,
      email,
      phone: String(f.get("phone") ?? "").trim(),
      note: String(f.get("note") ?? "").trim().slice(0, 1000),
      notify: f.get("notify") === "on",
    });
  });
}
export async function blockTimeAction(f: FormData) {
  await run(f, (t) => t.flash.blocked, async (p, t) => {
    const date = String(f.get("date"));
    await blockTime(p, {
      startsAt: localInstant(p, t, date, String(f.get("start"))),
      endsAt: localInstant(p, t, date, String(f.get("end"))),
      title: String(f.get("title") ?? "").trim().slice(0, 80),
    });
  });
}

// ---- Private access ----

export async function approveAccessAction(f: FormData) {
  await run(f, (t) => t.flash.accessApproved, (p) => approveAccess(p, id(f)));
}
export async function declineAccessAction(f: FormData) {
  await run(f, (t) => t.flash.accessDeclined, (p) => declineAccess(p, id(f)));
}
export async function revokeAccessAction(f: FormData) {
  await run(f, (t) => t.flash.linkOff, (p) => revokeAccess(p, id(f)));
}

// ---- Clients ----

export async function saveClientNotes(f: FormData) {
  await run(f, (t) => t.flash.notesSaved, async (p) => {
    const db = await getDb();
    await db.query(`update clients set notes = $3 where id = $1 and provider_id = $2`, [id(f), p.id, String(f.get("notes") ?? "").slice(0, 5000)]);
  });
}

// ---- Settings ----

export async function saveProfile(f: FormData) {
  await run(f, (t) => t.flash.profileSaved, async (p, t) => {
    const r = profileSchema.safeParse(formObject(f, ["display_name", "username", "timezone", "profession", "bio", "location_kind", "location_text", "avatar_url", "listed"]));
    if (!r.success) throw new UserError(localizeError(r.error.issues[0].message, t.locale));
    const v = r.data;
    try {
      await (await getDb()).query(
        `update providers set display_name = $2, username = $3, timezone = $4, bio = $5, location_kind = $6, location_text = $7, avatar_url = $8,
         profession = $9, listed = $10, updated_at = now() where id = $1`,
        [p.id, v.display_name, v.username, v.timezone, v.bio, v.location_kind, v.location_text, v.avatar_url || null, v.profession, v.listed ?? false],
      );
    } catch (e) {
      if (pgCode(e) === "23505") throw new UserError(t.errors.taken(v.username));
      throw e;
    }
  });
}

function intField(f: FormData, t: T, key: string, min: number, max: number, label: string) {
  const v = Number(f.get(key));
  if (!Number.isInteger(v) || v < min || v > max) throw new UserError(t.errors.range(label, min, max));
  return v;
}

export async function saveRules(f: FormData) {
  await run(f, (t) => t.flash.rulesSaved, async (p, t) => {
    const mode = String(f.get("access_mode"));
    if (!["open", "approval", "private"].includes(mode)) throw new UserError(t.errors.pickMode);
    const fields = t.errors.fields;
    const values = [
      intField(f, t, "min_notice_minutes", 0, 20160, fields.notice),
      intField(f, t, "horizon_days", 1, 365, fields.horizon),
      intField(f, t, "buffer_minutes", 0, 240, fields.buffer),
      intField(f, t, "pending_expiry_hours", 1, 168, fields.hold),
      intField(f, t, "access_link_days", 1, 365, fields.linkDays),
    ];
    await (await getDb()).query(
      `update providers set access_mode = $2, min_notice_minutes = $3, horizon_days = $4, buffer_minutes = $5,
         pending_expiry_hours = $6, access_link_days = $7, updated_at = now() where id = $1`,
      [p.id, mode, ...values],
    );
  });
}

function parseService(f: FormData, t: T) {
  const r = serviceSchema.safeParse(formObject(f, ["name", "description", "duration_minutes", "price"]));
  if (!r.success) throw new UserError(localizeError(r.error.issues[0].message, t.locale));
  const cents = priceToCents(r.data.price);
  if (cents === "invalid") throw new UserError(t.errors.price);
  return { ...r.data, price_cents: cents };
}

export async function addService(f: FormData) {
  await run(f, (t) => t.flash.serviceAdded, async (p, t) => {
    const s = parseService(f, t);
    const db = await getDb();
    const [cur] = await db.query<{ currency: string }>(`select currency from services where provider_id = $1 order by position limit 1`, [p.id]);
    await db.query(
      `insert into services (provider_id, name, description, duration_minutes, price_cents, currency, position)
       values ($1, $2, $3, $4, $5, $6, (select coalesce(max(position), 0) + 1 from services where provider_id = $1))`,
      [p.id, s.name, s.description, s.duration_minutes, s.price_cents, cur?.currency ?? "USD"],
    );
  });
}

export async function updateService(f: FormData) {
  await run(f, (t) => t.flash.serviceSaved, async (p, t) => {
    const s = parseService(f, t);
    await (await getDb()).query(
      `update services set name = $3, description = $4, duration_minutes = $5, price_cents = $6, active = $7 where id = $1 and provider_id = $2`,
      [id(f), p.id, s.name, s.description, s.duration_minutes, s.price_cents, f.get("active") === "on"],
    );
  });
}

export async function deleteService(f: FormData) {
  await run(f, (t) => t.flash.serviceRemoved, async (p) => {
    await (await getDb()).query(`delete from services where id = $1 and provider_id = $2`, [id(f), p.id]);
  });
}

export async function saveHours(f: FormData) {
  await run(f, (t) => t.flash.hoursSaved, async (p, t) => {
    const parsed = parseHoursForm(f, t.locale);
    if ("error" in parsed) throw new UserError(parsed.error);
    await (await getDb()).tx(async (q) => {
      await q.query(`delete from weekly_hours where provider_id = $1`, [p.id]);
      for (const [day, ivs] of Object.entries(parsed.hours)) {
        for (const iv of ivs) {
          await q.query(`insert into weekly_hours (provider_id, weekday, start_minute, end_minute) values ($1, $2, $3, $4)`, [p.id, Number(day), iv.start, iv.end]);
        }
      }
    });
  });
}

export async function addException(f: FormData) {
  await run(f, (t) => t.flash.dateSaved, async (p, t) => {
    const date = String(f.get("date"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError(t.errors.pickDate);
    const closed = f.get("kind") !== "hours";
    let s: number | null = null;
    let e: number | null = null;
    if (!closed) {
      s = hhmmToMinutes(String(f.get("start")));
      e = hhmmToMinutes(String(f.get("end")));
      if (s == null || e == null || e <= s) throw new UserError(t.errors.endAfterStart);
    }
    await (await getDb()).tx(async (q) => {
      // "Closed" replaces any hours set for that date; special hours replace a closed marker.
      if (closed) await q.query(`delete from availability_exceptions where provider_id = $1 and date = $2`, [p.id, date]);
      else await q.query(`delete from availability_exceptions where provider_id = $1 and date = $2 and start_minute is null`, [p.id, date]);
      await q.query(
        `insert into availability_exceptions (provider_id, date, start_minute, end_minute, note) values ($1, $2, $3, $4, $5)`,
        [p.id, date, s, e, String(f.get("note") ?? "").slice(0, 100)],
      );
    });
  });
}

export async function removeException(f: FormData) {
  await run(f, (t) => t.flash.dateRemoved, async (p) => {
    await (await getDb()).query(`delete from availability_exceptions where id = $1 and provider_id = $2`, [id(f), p.id]);
  });
}


export async function markBookingsSeenAction(f: FormData) {
  const provider = await requireProvider();
  await (await getDb()).query(`update providers set bookings_seen_at = now() where id = $1`, [provider.id]);
  redirect(backTo(f));
}
