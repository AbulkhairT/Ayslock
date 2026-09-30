import { after } from "next/server";
import type { Db, Queryable } from "./db";
import { env, modes } from "./env";

export interface EnqueueInput {
  providerId: string;
  appointmentId?: string | null;
  accessGrantId?: string | null;
  kind: string;
  to: string;
  subject: string;
  body: string;
  sendAfter?: Date;
  forStartsAt?: Date | null;
  dedupeKey: string;
}

/** Idempotent: the same dedupe key is only ever queued once. */
export async function enqueue(q: Queryable, n: EnqueueInput) {
  await q.query(
    `insert into notifications (provider_id, appointment_id, access_grant_id, kind, to_email, subject, body, send_after, for_starts_at, dedupe_key)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (dedupe_key) do nothing`,
    [n.providerId, n.appointmentId ?? null, n.accessGrantId ?? null, n.kind, n.to, n.subject, n.body, n.sendAfter ?? new Date(), n.forStartsAt ?? null, n.dedupeKey],
  );
}

export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

/**
 * Queue the 24-hour reminder. Appointments booked less than 24 hours ahead get none,
 * because the confirmation already covers them.
 */
export async function scheduleReminder(
  q: Queryable,
  a: { providerId: string; appointmentId: string; startsAt: Date; to: string; subject: string; body: string },
  now = new Date(),
) {
  const sendAfter = new Date(a.startsAt.getTime() - REMINDER_LEAD_MS);
  if (sendAfter.getTime() <= now.getTime()) return false;
  await enqueue(q, {
    providerId: a.providerId,
    appointmentId: a.appointmentId,
    kind: "reminder",
    to: a.to,
    subject: a.subject,
    body: a.body,
    sendAfter,
    forStartsAt: a.startsAt,
    dedupeKey: `reminder:${a.appointmentId}:${a.startsAt.getTime()}`,
  });
  return true;
}

export async function cancelReminders(q: Queryable, appointmentId: string) {
  await q.query(
    `update notifications set status = 'cancelled' where appointment_id = $1 and kind = 'reminder' and status = 'queued'`,
    [appointmentId],
  );
}

interface ClaimedRow {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body: string;
  appointment_id: string | null;
  for_starts_at: Date | null;
  attempts: number;
}

export type Sender = (n: ClaimedRow) => Promise<"sent" | "previewed">;

async function resendSender(n: ClaimedRow): Promise<"sent"> {
  // RESEND_API_URL only exists so delivery can be tested against a local stand-in.
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
      // Resend drops repeats of the same key, so a retry after a crash cannot send twice.
      "Idempotency-Key": `ayslock-${n.id}`,
    },
    body: JSON.stringify({ from: env.emailFrom, to: [n.to_email], subject: n.subject, text: n.body }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return "sent";
}

const previewSender: Sender = async () => "previewed";

export function defaultSender(): Sender {
  return modes.email === "resend" ? resendSender : previewSender;
}

/**
 * Deliver due notifications. Safe to run from several workers at once: rows are claimed
 * with SKIP LOCKED and leased, and reminders are re-checked against the live appointment.
 */
/**
 * Send whatever is due once the current response is finished. On serverless hosts a
 * plain fire-and-forget promise can be frozen with the function; after() keeps it alive.
 * Outside a request (tests, scripts) it just runs in the background.
 */
export function sendSoon(db: Db) {
  const run = () => processDue(db).then(
    () => undefined,
    (e) => console.error("notification worker", e),
  );
  try {
    after(run);
  } catch {
    void run();
  }
}

export async function processDue(db: Db, opts: { limit?: number; sender?: Sender } = {}) {
  const sender = opts.sender ?? defaultSender();
  const claimed = await db.tx((q) =>
    q.query<ClaimedRow>(
      `update notifications set status = 'sending', attempts = attempts + 1, locked_until = now() + interval '5 minutes'
       where id in (
         select id from notifications
         where (status = 'queued' and send_after <= now()) or (status = 'sending' and locked_until < now())
         order by send_after
         limit $1
         for update skip locked
       )
       returning id, kind, to_email, subject, body, appointment_id, for_starts_at, attempts`,
      [opts.limit ?? 50],
    ),
  );
  const result = { sent: 0, previewed: 0, skipped: 0, failed: 0 };
  for (const n of claimed) {
    if (n.kind === "reminder" && n.appointment_id) {
      const live = await db.query<{ ok: boolean }>(
        `select (status = 'confirmed' and starts_at = $2 and starts_at > now()) as ok from appointments where id = $1`,
        [n.appointment_id, n.for_starts_at],
      );
      if (!live[0]?.ok) {
        await db.query(`update notifications set status = 'skipped', locked_until = null where id = $1`, [n.id]);
        result.skipped++;
        continue;
      }
    }
    try {
      const outcome = await sender(n);
      await db.query(
        `update notifications set status = $2, sent_at = now(), locked_until = null, last_error = null where id = $1 and status = 'sending'`,
        [n.id, outcome],
      );
      result[outcome]++;
    } catch (e) {
      const failed = n.attempts >= 5;
      await db.query(
        `update notifications set status = $2, last_error = $3, locked_until = null,
           send_after = now() + make_interval(mins => $4) where id = $1`,
        [n.id, failed ? "failed" : "queued", String((e as Error).message).slice(0, 500), 2 ** n.attempts],
      );
      result.failed++;
    }
  }
  return result;
}
