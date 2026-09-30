import { DateTime } from "luxon";
import type { Queryable } from "./db";
import { exceptionRows, exceptionsMap, weeklyHours } from "./providers";
import { generateSlots } from "./slots";
import type { Provider, Service } from "./types";

export interface SlotQuery {
  from: Date;
  to: Date;
  now?: Date;
  excludeAppointmentId?: string;
}

/** Bookable slots for a service, computed from live data. Never returns anything but start times. */
export async function availableSlots(q: Queryable, provider: Provider, service: Service, sq: SlotQuery): Promise<Date[]> {
  const now = sq.now ?? new Date();
  const zone = provider.timezone;
  const fromDate = DateTime.fromJSDate(sq.from).setZone(zone).minus({ days: 2 }).toISODate()!;
  const toDate = DateTime.fromJSDate(sq.to).setZone(zone).plus({ days: 2 }).toISODate()!;
  // Sequential on purpose: q may be a single transaction connection.
  const weekly = await weeklyHours(q, provider.id);
  const exRows = await exceptionRows(q, provider.id, fromDate, toDate);
  const busy = await q.query<{ starts_at: Date; occupied_until: Date }>(
      `select starts_at, occupied_until from appointments
       where provider_id = $1
         and status in ('pending', 'confirmed')
         and (status <> 'pending' or expires_at > $4)
         and occupied_until > $2::timestamptz - interval '1 day'
         and starts_at < $3::timestamptz + interval '1 day'
         and ($5::uuid is null or id <> $5::uuid)`,
      [provider.id, sq.from, sq.to, now, sq.excludeAppointmentId ?? null],
  );
  return generateSlots({
    timezone: zone,
    weekly,
    exceptions: exceptionsMap(exRows),
    busy: busy.map((b) => ({ start: new Date(b.starts_at), until: new Date(b.occupied_until) })),
    durationMinutes: service.duration_minutes,
    bufferMinutes: provider.buffer_minutes,
    minNoticeMinutes: provider.min_notice_minutes,
    horizonDays: provider.horizon_days,
    now,
    from: sq.from,
    to: sq.to,
  });
}

export async function isSlotAvailable(q: Queryable, provider: Provider, service: Service, start: Date, opts: { now?: Date; excludeAppointmentId?: string } = {}) {
  const slots = await availableSlots(q, provider, service, {
    from: new Date(start.getTime() - 60_000),
    to: new Date(start.getTime() + 60_000),
    now: opts.now,
    excludeAppointmentId: opts.excludeAppointmentId,
  });
  return slots.some((s) => s.getTime() === start.getTime());
}
