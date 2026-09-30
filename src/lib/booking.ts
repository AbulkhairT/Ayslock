import { z } from "zod";
import { getDb, pgCode, type Db, type Queryable } from "./db";
import { isSlotAvailable } from "./availability";
import { emails } from "./messages";
import { cancelReminders, enqueue, scheduleReminder, sendSoon } from "./notify";
import { providerById, providerByUsername } from "./providers";
import { rateLimit } from "./ratelimit";
import { signToken, tokenRecordId, verifyToken } from "./tokens";
import { APPT_COLS, type Appointment, type Provider, type Service } from "./types";
import { verifyAccess } from "./access";
import { isValidZone } from "./format";

export type BookingErrorCode = "slot_taken" | "not_available" | "not_found" | "forbidden" | "invalid" | "expired";

export class BookingError extends Error {
  constructor(public code: BookingErrorCode, message: string) {
    super(message);
  }
}

export const SLOT_TAKEN_MESSAGE = "Someone just booked that time. Please pick another one.";

function isOverlap(e: unknown) {
  return pgCode(e) === "23P01";
}

/**
 * Mark pending requests whose hold ran out as expired, and tell the client. Called at the
 * start of every write for the provider (so an expired hold never blocks a slot) and by
 * the background job.
 */
export async function sweepExpired(q: Queryable, providerId?: string) {
  const rows = await q.query<{ id: string; provider_id: string; service_name: string; starts_at: Date; ends_at: Date; client_timezone: string | null; name: string; email: string }>(
    `update appointments a set status = 'expired', updated_at = now()
     from clients c
     where a.client_id = c.id and a.status = 'pending' and a.expires_at <= now()
       and ($1::uuid is null or a.provider_id = $1::uuid)
     returning a.id, a.provider_id, a.service_name, a.starts_at, a.ends_at, a.client_timezone, c.name, c.email`,
    [providerId ?? null],
  );
  for (const r of rows) {
    const provider = await providerById(q, r.provider_id);
    if (!provider) continue;
    const m = emails.expired({
      provider,
      serviceName: r.service_name,
      startsAt: new Date(r.starts_at),
      endsAt: new Date(r.ends_at),
      clientName: r.name,
      clientZone: r.client_timezone || provider.timezone,
    });
    await enqueue(q, { providerId: r.provider_id, appointmentId: r.id, kind: "expired", to: r.email, ...m, dedupeKey: `expired:${r.id}` });
  }
  return rows.length;
}

async function loadService(q: Queryable, providerId: string, serviceId: string): Promise<Service | null> {
  const rows = await q.query<Service>(
    `select id, provider_id, name, description, duration_minutes, price_cents, currency, active, position
     from services where id = $1 and provider_id = $2`,
    [serviceId, providerId],
  );
  return rows[0] ?? null;
}

async function upsertClient(q: Queryable, providerId: string, c: { name: string; email: string; phone?: string | null }) {
  const rows = await q.query<{ id: string }>(
    `insert into clients (provider_id, name, email, phone) values ($1, $2, $3, $4)
     on conflict (provider_id, email) do update
       set name = excluded.name, phone = coalesce(excluded.phone, clients.phone)
     returning id`,
    [providerId, c.name, c.email.toLowerCase(), c.phone || null],
  );
  return rows[0].id;
}

/** Kick the notification worker after a write, so confirmations go out right away. */
function kick(db: Db) {
  sendSoon(db);
}

const uuid = z.string().uuid();

export const bookingInput = z.object({
  username: z.string().min(1).max(40),
  serviceId: uuid,
  startsAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  timezone: z.string().max(64).refine(isValidZone, "Unknown timezone."),
  accessToken: z.string().max(80).optional().nullable(),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot, must stay empty
});
export type BookingInput = z.infer<typeof bookingInput>;

export interface BookingResult {
  status: "confirmed" | "pending";
  manageToken: string;
  appointmentId: string;
}

/** Client booking. Rechecks availability inside the transaction; the database constraint is the final word. */
export async function createBooking(raw: unknown, ctx: { ip?: string; now?: Date } = {}): Promise<BookingResult> {
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) throw new BookingError("invalid", parsed.error.issues[0]?.message ?? "Please check your details.");
  const input = parsed.data;
  if (input.website) throw new BookingError("invalid", "Please check your details.");
  const db = await getDb();
  const provider = await providerByUsername(db, input.username);
  if (!provider) throw new BookingError("not_found", "We couldn't find that provider.");
  if (ctx.ip) await rateLimit(db, `book:${ctx.ip}:${provider.id}`, 10, 3600);
  await rateLimit(db, `book-email:${input.email}:${provider.id}`, 6, 3600);

  let result: BookingResult;
  try {
    result = await db.tx(async (q) => {
      await sweepExpired(q, provider.id);
      if (provider.access_mode === "private") {
        const grant = await verifyAccess(q, provider, input.accessToken);
        if (!grant) throw new BookingError("forbidden", "This booking link is no longer valid. Ask for access again.");
      }
      const service = await loadService(q, provider.id, input.serviceId);
      if (!service || !service.active) throw new BookingError("not_found", "That service is no longer offered.");
      const startsAt = new Date(input.startsAt);
      if (!(await isSlotAvailable(q, provider, service, startsAt, { now: ctx.now }))) {
        throw new BookingError("slot_taken", SLOT_TAKEN_MESSAGE);
      }
      const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
      const occupiedUntil = new Date(endsAt.getTime() + provider.buffer_minutes * 60_000);
      const pending = provider.access_mode === "approval";
      const now = ctx.now ?? new Date();
      const expiresAt = pending
        ? new Date(Math.min(now.getTime() + provider.pending_expiry_hours * 3_600_000, startsAt.getTime()))
        : null;
      const clientId = await upsertClient(q, provider.id, input);
      const [appt] = await q.query<{ id: string }>(
        `insert into appointments (provider_id, kind, status, service_id, client_id, service_name, starts_at, ends_at,
           occupied_until, provider_timezone, client_timezone, client_note, source, expires_at)
         values ($1, 'booking', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'client', $12)
         returning id`,
        [provider.id, pending ? "pending" : "confirmed", service.id, clientId, service.name, startsAt, endsAt, occupiedUntil,
          provider.timezone, input.timezone, input.note || null, expiresAt],
      );
      const manageToken = signToken("manage", appt.id, 1);
      const d = { provider, serviceName: service.name, startsAt, endsAt, clientName: input.name, clientZone: input.timezone, manageToken };
      const toClient = pending ? emails.requested(d, expiresAt!) : emails.confirmed(d);
      await enqueue(q, { providerId: provider.id, appointmentId: appt.id, kind: pending ? "requested" : "confirmation", to: input.email, ...toClient, dedupeKey: `${pending ? "requested" : "confirmation"}:${appt.id}` });
      await enqueue(q, { providerId: provider.id, appointmentId: appt.id, kind: "provider_new", to: provider.email, ...emails.providerNew(d, pending), dedupeKey: `provider_new:${appt.id}` });
      if (!pending) {
        await scheduleReminder(q, { providerId: provider.id, appointmentId: appt.id, startsAt, to: input.email, ...emails.reminder(d) }, now);
      }
      return { status: pending ? "pending" : "confirmed", manageToken, appointmentId: appt.id } as BookingResult;
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("slot_taken", SLOT_TAKEN_MESSAGE);
    throw e;
  }
  kick(db);
  return result;
}

// ---------- Manage links (client side) ----------

export interface ManagedAppointment {
  appointment: Appointment;
  provider: Provider;
  service: Service | null;
  client: { name: string; email: string };
}

/** Resolve a manage token to exactly one appointment. Anything else gets null. */
export async function appointmentByToken(q: Queryable, token: string | null | undefined): Promise<ManagedAppointment | null> {
  const id = tokenRecordId(token);
  if (!id || !token) return null;
  const rows = await q.query<Appointment>(`select ${APPT_COLS} from appointments where id = $1 and kind = 'booking'`, [id]);
  const appointment = rows[0];
  if (!appointment || !verifyToken("manage", token, id, appointment.token_version)) return null;
  const provider = await providerById(q, appointment.provider_id);
  if (!provider) return null;
  const service = appointment.service_id ? await loadService(q, provider.id, appointment.service_id) : null;
  const [client] = await q.query<{ name: string; email: string }>(`select name, email from clients where id = $1`, [appointment.client_id]);
  return { appointment, provider, service, client };
}

function detailsFor(m: ManagedAppointment, a: Appointment, manageToken?: string) {
  return {
    provider: m.provider,
    serviceName: a.service_name ?? "Appointment",
    startsAt: new Date(a.starts_at),
    endsAt: new Date(a.ends_at),
    clientName: m.client.name,
    clientZone: a.client_timezone || m.provider.timezone,
    manageToken,
  };
}

export async function cancelByClient(token: string) {
  const db = await getDb();
  await db.tx(async (q) => {
    const m = await appointmentByToken(q, token);
    if (!m) throw new BookingError("not_found", "This link isn't valid.");
    const [a] = await q.query<Appointment>(
      `update appointments set status = 'cancelled', cancelled_by = 'client', cancelled_at = now(), updated_at = now()
       where id = $1 and status in ('pending', 'confirmed') and starts_at > now() returning ${APPT_COLS}`,
      [m.appointment.id],
    );
    if (!a) throw new BookingError("invalid", "This appointment can't be cancelled anymore.");
    await cancelReminders(q, a.id);
    const d = detailsFor(m, a);
    await enqueue(q, { providerId: a.provider_id, appointmentId: a.id, kind: "cancelled", to: m.client.email, ...emails.cancelled(d, "client"), dedupeKey: `cancelled:${a.id}` });
    await enqueue(q, { providerId: a.provider_id, appointmentId: a.id, kind: "provider_changed", to: m.provider.email, ...emails.providerChanged(d, "cancelled"), dedupeKey: `provider_cancelled:${a.id}` });
  });
  kick(db);
}

/** Move an appointment to a new start. Clients must pick an offered slot; providers may place it anywhere free. */
async function moveAppointment(q: Queryable, m: ManagedAppointment, newStart: Date, by: "client" | "provider", manageToken: string, now = new Date()) {
  const a = m.appointment;
  if (!["pending", "confirmed"].includes(a.status)) throw new BookingError("invalid", "This appointment can't be changed anymore.");
  if (by === "client" && new Date(a.starts_at).getTime() <= now.getTime()) throw new BookingError("invalid", "This appointment already started.");
  const durationMs = new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime();
  if (by === "client") {
    if (!m.service) throw new BookingError("not_available", "This service is no longer offered. Please cancel and book again.");
    if (!(await isSlotAvailable(q, m.provider, m.service, newStart, { now, excludeAppointmentId: a.id }))) {
      throw new BookingError("slot_taken", SLOT_TAKEN_MESSAGE);
    }
  }
  const endsAt = new Date(newStart.getTime() + durationMs);
  const occupiedUntil = new Date(endsAt.getTime() + m.provider.buffer_minutes * 60_000);
  // In approval mode a client-chosen new time needs approval again.
  const pending = by === "client" && m.provider.access_mode === "approval";
  const expiresAt = pending ? new Date(Math.min(now.getTime() + m.provider.pending_expiry_hours * 3_600_000, newStart.getTime())) : null;
  const [updated] = await q.query<Appointment>(
    `update appointments set starts_at = $2, ends_at = $3, occupied_until = $4, status = $5, expires_at = $6, updated_at = now()
     where id = $1 and status in ('pending', 'confirmed') returning ${APPT_COLS}`,
    [a.id, newStart, endsAt, occupiedUntil, pending ? "pending" : a.status, pending ? expiresAt : a.status === "pending" ? a.expires_at : null],
  );
  if (!updated) throw new BookingError("invalid", "This appointment can't be changed anymore.");
  await cancelReminders(q, a.id);
  const d = detailsFor(m, updated, manageToken);
  const stamp = newStart.getTime();
  await enqueue(q, { providerId: a.provider_id, appointmentId: a.id, kind: "rescheduled", to: m.client.email, ...emails.rescheduled(d, updated.status === "pending"), dedupeKey: `rescheduled:${a.id}:${stamp}` });
  if (by === "client") {
    await enqueue(q, { providerId: a.provider_id, appointmentId: a.id, kind: "provider_changed", to: m.provider.email, ...emails.providerChanged(d, "rescheduled"), dedupeKey: `provider_rescheduled:${a.id}:${stamp}` });
  }
  if (updated.status === "confirmed") {
    await scheduleReminder(q, { providerId: a.provider_id, appointmentId: a.id, startsAt: newStart, to: m.client.email, ...emails.reminder(d) }, now);
  }
  return updated;
}

export async function rescheduleByClient(token: string, startsAtIso: string) {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) throw new BookingError("invalid", "Please pick a time.");
  const db = await getDb();
  try {
    const out = await db.tx(async (q) => {
      const m = await appointmentByToken(q, token);
      if (!m) throw new BookingError("not_found", "This link isn't valid.");
      await sweepExpired(q, m.provider.id);
      const fresh = await appointmentByToken(q, token);
      return moveAppointment(q, fresh!, start, "client", token);
    });
    kick(db);
    return out;
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("slot_taken", SLOT_TAKEN_MESSAGE);
    throw e;
  }
}

// ---------- Provider actions (always scoped to the signed-in provider) ----------

async function managedForProvider(q: Queryable, provider: Provider, appointmentId: string): Promise<ManagedAppointment> {
  const rows = await q.query<Appointment>(`select ${APPT_COLS} from appointments where id = $1 and provider_id = $2 and kind = 'booking'`, [appointmentId, provider.id]);
  const appointment = rows[0];
  if (!appointment) throw new BookingError("not_found", "Appointment not found.");
  const service = appointment.service_id ? await loadService(q, provider.id, appointment.service_id) : null;
  const [client] = await q.query<{ name: string; email: string }>(`select name, email from clients where id = $1 and provider_id = $2`, [appointment.client_id, provider.id]);
  return { appointment, provider, service, client };
}

export async function approveRequest(provider: Provider, appointmentId: string) {
  const db = await getDb();
  await db.tx(async (q) => {
    await sweepExpired(q, provider.id);
    const m = await managedForProvider(q, provider, appointmentId);
    const [a] = await q.query<Appointment>(
      `update appointments set status = 'confirmed', expires_at = null, updated_at = now()
       where id = $1 and provider_id = $2 and status = 'pending' returning ${APPT_COLS}`,
      [appointmentId, provider.id],
    );
    if (!a) throw new BookingError("expired", "This request expired or was already handled.");
    const token = signToken("manage", a.id, a.token_version);
    const d = detailsFor(m, a, token);
    await enqueue(q, { providerId: provider.id, appointmentId: a.id, kind: "approved", to: m.client.email, ...emails.approved(d), dedupeKey: `approved:${a.id}:${new Date(a.starts_at).getTime()}` });
    await scheduleReminder(q, { providerId: provider.id, appointmentId: a.id, startsAt: new Date(a.starts_at), to: m.client.email, ...emails.reminder(d) });
  });
  kick(db);
}

export async function declineRequest(provider: Provider, appointmentId: string) {
  const db = await getDb();
  await db.tx(async (q) => {
    const m = await managedForProvider(q, provider, appointmentId);
    const [a] = await q.query<Appointment>(
      `update appointments set status = 'declined', updated_at = now()
       where id = $1 and provider_id = $2 and status = 'pending' returning ${APPT_COLS}`,
      [appointmentId, provider.id],
    );
    if (!a) throw new BookingError("expired", "This request expired or was already handled.");
    await enqueue(q, { providerId: provider.id, appointmentId: a.id, kind: "declined", to: m.client.email, ...emails.declined(detailsFor(m, a)), dedupeKey: `declined:${a.id}` });
  });
  kick(db);
}

export async function cancelByProvider(provider: Provider, appointmentId: string, notifyClient = true) {
  const db = await getDb();
  await db.tx(async (q) => {
    const [row] = await q.query<{ kind: string }>(`select kind from appointments where id = $1 and provider_id = $2`, [appointmentId, provider.id]);
    if (!row) throw new BookingError("not_found", "Appointment not found.");
    if (row.kind === "block") {
      await q.query(`update appointments set status = 'cancelled', cancelled_by = 'provider', cancelled_at = now(), updated_at = now() where id = $1 and provider_id = $2`, [appointmentId, provider.id]);
      return;
    }
    const m = await managedForProvider(q, provider, appointmentId);
    const [a] = await q.query<Appointment>(
      `update appointments set status = 'cancelled', cancelled_by = 'provider', cancelled_at = now(), updated_at = now()
       where id = $1 and provider_id = $2 and status in ('pending', 'confirmed') returning ${APPT_COLS}`,
      [appointmentId, provider.id],
    );
    if (!a) throw new BookingError("invalid", "This appointment is already closed.");
    await cancelReminders(q, a.id);
    if (notifyClient) {
      await enqueue(q, { providerId: provider.id, appointmentId: a.id, kind: "cancelled", to: m.client.email, ...emails.cancelled(detailsFor(m, a), "provider"), dedupeKey: `cancelled:${a.id}` });
    }
  });
  kick(db);
}

export async function rescheduleByProvider(provider: Provider, appointmentId: string, newStart: Date) {
  const db = await getDb();
  try {
    await db.tx(async (q) => {
      await sweepExpired(q, provider.id);
      const m = await managedForProvider(q, provider, appointmentId);
      await moveAppointment(q, m, newStart, "provider", signToken("manage", m.appointment.id, m.appointment.token_version));
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("slot_taken", "That time overlaps another appointment or blocked time.");
    throw e;
  }
  kick(db);
}

/** Manual appointment added by the provider. It may sit outside working hours, but never overlaps. */
export async function addManualAppointment(
  provider: Provider,
  input: { serviceId: string; startsAt: Date; name: string; email: string; phone?: string; note?: string; notify: boolean },
) {
  const db = await getDb();
  try {
    await db.tx(async (q) => {
      await sweepExpired(q, provider.id);
      const service = await loadService(q, provider.id, input.serviceId);
      if (!service) throw new BookingError("not_found", "Pick a service.");
      const endsAt = new Date(input.startsAt.getTime() + service.duration_minutes * 60_000);
      const occupiedUntil = new Date(endsAt.getTime() + provider.buffer_minutes * 60_000);
      const clientId = await upsertClient(q, provider.id, { name: input.name, email: input.email, phone: input.phone });
      const [appt] = await q.query<{ id: string }>(
        `insert into appointments (provider_id, kind, status, service_id, client_id, service_name, starts_at, ends_at,
           occupied_until, provider_timezone, client_timezone, client_note, source)
         values ($1, 'booking', 'confirmed', $2, $3, $4, $5, $6, $7, $8, $8, $9, 'provider') returning id`,
        [provider.id, service.id, clientId, service.name, input.startsAt, endsAt, occupiedUntil, provider.timezone, input.note || null],
      );
      if (input.notify) {
        const token = signToken("manage", appt.id, 1);
        const d = { provider, serviceName: service.name, startsAt: input.startsAt, endsAt, clientName: input.name, clientZone: provider.timezone, manageToken: token };
        await enqueue(q, { providerId: provider.id, appointmentId: appt.id, kind: "confirmation", to: input.email.toLowerCase(), ...emails.confirmed(d), dedupeKey: `confirmation:${appt.id}` });
        await scheduleReminder(q, { providerId: provider.id, appointmentId: appt.id, startsAt: input.startsAt, to: input.email.toLowerCase(), ...emails.reminder(d) });
      }
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("slot_taken", "That time overlaps another appointment or blocked time.");
    throw e;
  }
  kick(db);
}

export async function blockTime(provider: Provider, input: { startsAt: Date; endsAt: Date; title: string }) {
  if (input.endsAt <= input.startsAt) throw new BookingError("invalid", "The end must be after the start.");
  const db = await getDb();
  try {
    await db.tx(async (q) => {
      await sweepExpired(q, provider.id);
      await q.query(
        `insert into appointments (provider_id, kind, status, starts_at, ends_at, occupied_until, provider_timezone, title, source)
         values ($1, 'block', 'confirmed', $2, $3, $3, $4, $5, 'provider')`,
        [provider.id, input.startsAt, input.endsAt, provider.timezone, input.title || "Blocked"],
      );
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("slot_taken", "That time overlaps an appointment. Cancel or move it first.");
    throw e;
  }
}
