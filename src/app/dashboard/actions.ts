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

async function run(form: FormData, ok: string, fn: (p: Provider) => Promise<unknown>) {
  const provider = await requireProvider();
  const back = backTo(form);
  try {
    await fn(provider);
  } catch (e) {
    if (e instanceof BookingError || e instanceof UserError) go(back, { err: e.message });
    if (e instanceof Error && /already handled/.test(e.message)) go(back, { err: e.message });
    throw e;
  }
  go(back, { ok });
}

class UserError extends Error {}

function localInstant(p: Provider, date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError("Pick a date.");
  const m = hhmmToMinutes(time);
  if (m == null) throw new UserError("Pick a time.");
  const dt = localToUtc(date, m, p.timezone);
  if (!dt) throw new UserError("That time doesn't exist on that date because of a daylight saving change.");
  return dt.toJSDate();
}

const id = (f: FormData) => String(f.get("id") ?? "");

// ---- Schedule ----

export async function approveAction(f: FormData) {
  await run(f, "Approved. The client has been notified.", (p) => approveRequest(p, id(f)));
}
export async function declineAction(f: FormData) {
  await run(f, "Declined. The client has been notified.", (p) => declineRequest(p, id(f)));
}
export async function cancelAction(f: FormData) {
  await run(f, "Cancelled.", (p) => cancelByProvider(p, id(f), f.get("notify") !== "0"));
}
export async function rescheduleAction(f: FormData) {
  await run(f, "Moved. The client has been notified.", (p) =>
    rescheduleByProvider(p, id(f), localInstant(p, String(f.get("date")), String(f.get("time")))),
  );
}
export async function addAppointmentAction(f: FormData) {
  await run(f, "Appointment added.", async (p) => {
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    if (!name) throw new UserError("Add the client's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("Add a valid client email.");
    await addManualAppointment(p, {
      serviceId: String(f.get("serviceId")),
      startsAt: localInstant(p, String(f.get("date")), String(f.get("time"))),
      name,
      email,
      phone: String(f.get("phone") ?? "").trim(),
      note: String(f.get("note") ?? "").trim().slice(0, 1000),
      notify: f.get("notify") === "on",
    });
  });
}
export async function blockTimeAction(f: FormData) {
  await run(f, "Time blocked.", async (p) => {
    const date = String(f.get("date"));
    await blockTime(p, {
      startsAt: localInstant(p, date, String(f.get("start"))),
      endsAt: localInstant(p, date, String(f.get("end"))),
      title: String(f.get("title") ?? "").trim().slice(0, 80),
    });
  });
}

// ---- Private access ----

export async function approveAccessAction(f: FormData) {
  await run(f, "Access approved. We emailed them a private booking link.", (p) => approveAccess(p, id(f)));
}
export async function declineAccessAction(f: FormData) {
  await run(f, "Request declined.", (p) => declineAccess(p, id(f)));
}
export async function revokeAccessAction(f: FormData) {
  await run(f, "Link turned off.", (p) => revokeAccess(p, id(f)));
}

// ---- Clients ----

export async function saveClientNotes(f: FormData) {
  await run(f, "Notes saved.", async (p) => {
    const db = await getDb();
    await db.query(`update clients set notes = $3 where id = $1 and provider_id = $2`, [id(f), p.id, String(f.get("notes") ?? "").slice(0, 5000)]);
  });
}

// ---- Settings ----

export async function saveProfile(f: FormData) {
  await run(f, "Profile saved.", async (p) => {
    const r = profileSchema.safeParse(formObject(f, ["display_name", "username", "timezone", "bio", "location_kind", "location_text", "avatar_url"]));
    if (!r.success) throw new UserError(r.error.issues[0].message);
    const v = r.data;
    try {
      await (await getDb()).query(
        `update providers set display_name = $2, username = $3, timezone = $4, bio = $5, location_kind = $6, location_text = $7, avatar_url = $8, updated_at = now() where id = $1`,
        [p.id, v.display_name, v.username, v.timezone, v.bio, v.location_kind, v.location_text, v.avatar_url || null],
      );
    } catch (e) {
      if (pgCode(e) === "23505") throw new UserError(`@${v.username} is taken. Try another username.`);
      throw e;
    }
  });
}

function intField(f: FormData, key: string, min: number, max: number, label: string) {
  const v = Number(f.get(key));
  if (!Number.isInteger(v) || v < min || v > max) throw new UserError(`${label} must be between ${min} and ${max}.`);
  return v;
}

export async function saveRules(f: FormData) {
  await run(f, "Booking settings saved.", async (p) => {
    const mode = String(f.get("access_mode"));
    if (!["open", "approval", "private"].includes(mode)) throw new UserError("Pick a booking mode.");
    const values = [
      intField(f, "min_notice_minutes", 0, 20160, "Minimum notice"),
      intField(f, "horizon_days", 1, 365, "Booking window"),
      intField(f, "buffer_minutes", 0, 240, "Buffer"),
      intField(f, "pending_expiry_hours", 1, 168, "Request hold time"),
      intField(f, "access_link_days", 1, 365, "Private link validity"),
    ];
    await (await getDb()).query(
      `update providers set access_mode = $2, min_notice_minutes = $3, horizon_days = $4, buffer_minutes = $5,
         pending_expiry_hours = $6, access_link_days = $7, updated_at = now() where id = $1`,
      [p.id, mode, ...values],
    );
  });
}

function parseService(f: FormData) {
  const r = serviceSchema.safeParse(formObject(f, ["name", "description", "duration_minutes", "price"]));
  if (!r.success) throw new UserError(r.error.issues[0].message);
  const cents = priceToCents(r.data.price);
  if (cents === "invalid") throw new UserError("Check the price. Use a number like 40 or 42.50.");
  return { ...r.data, price_cents: cents };
}

export async function addService(f: FormData) {
  await run(f, "Service added.", async (p) => {
    const s = parseService(f);
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
  await run(f, "Service saved.", async (p) => {
    const s = parseService(f);
    await (await getDb()).query(
      `update services set name = $3, description = $4, duration_minutes = $5, price_cents = $6, active = $7 where id = $1 and provider_id = $2`,
      [id(f), p.id, s.name, s.description, s.duration_minutes, s.price_cents, f.get("active") === "on"],
    );
  });
}

export async function deleteService(f: FormData) {
  await run(f, "Service removed. Existing appointments keep their details.", async (p) => {
    await (await getDb()).query(`delete from services where id = $1 and provider_id = $2`, [id(f), p.id]);
  });
}

export async function saveHours(f: FormData) {
  await run(f, "Working hours saved.", async (p) => {
    const parsed = parseHoursForm(f);
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
  await run(f, "Date saved.", async (p) => {
    const date = String(f.get("date"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError("Pick a date.");
    const closed = f.get("kind") !== "hours";
    let s: number | null = null;
    let e: number | null = null;
    if (!closed) {
      s = hhmmToMinutes(String(f.get("start")));
      e = hhmmToMinutes(String(f.get("end")));
      if (s == null || e == null || e <= s) throw new UserError("The end time must be after the start time.");
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
  await run(f, "Date removed.", async (p) => {
    await (await getDb()).query(`delete from availability_exceptions where id = $1 and provider_id = $2`, [id(f), p.id]);
  });
}

