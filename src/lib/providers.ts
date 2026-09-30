import type { Queryable } from "./db";
import { visibleSql } from "./visibility";
import { PROVIDER_COLS, type Provider, type Service } from "./types";
import type { Interval } from "./slots";

export async function providerByUsername(q: Queryable, username: string): Promise<Provider | null> {
  const rows = await q.query<Provider>(`select ${PROVIDER_COLS} from providers where lower(username) = lower($1) and ${visibleSql()}`, [username]);
  return rows[0] ?? null;
}

export async function providerByOwner(q: Queryable, ownerId: string): Promise<Provider | null> {
  const rows = await q.query<Provider>(`select ${PROVIDER_COLS} from providers where owner_id = $1`, [ownerId]);
  return rows[0] ?? null;
}

export async function providerById(q: Queryable, id: string): Promise<Provider | null> {
  const rows = await q.query<Provider>(`select ${PROVIDER_COLS} from providers where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function servicesFor(q: Queryable, providerId: string, activeOnly = true): Promise<Service[]> {
  return q.query<Service>(
    `select id, provider_id, name, description, duration_minutes, price_cents, currency, active, position
     from services where provider_id = $1 ${activeOnly ? "and active" : ""} order by position, created_at`,
    [providerId],
  );
}

export async function weeklyHours(q: Queryable, providerId: string): Promise<Record<number, Interval[]>> {
  const rows = await q.query<{ weekday: number; start_minute: number; end_minute: number }>(
    `select weekday, start_minute, end_minute from weekly_hours where provider_id = $1 order by weekday, start_minute`,
    [providerId],
  );
  const out: Record<number, Interval[]> = {};
  for (const r of rows) (out[r.weekday] ??= []).push({ start: r.start_minute, end: r.end_minute });
  return out;
}

export interface ExceptionRow {
  id: string;
  date: string;
  start_minute: number | null;
  end_minute: number | null;
  note: string;
}

export async function exceptionRows(q: Queryable, providerId: string, fromDate: string, toDate: string): Promise<ExceptionRow[]> {
  return q.query<ExceptionRow>(
    `select id, to_char(date, 'YYYY-MM-DD') as date, start_minute, end_minute, note
     from availability_exceptions where provider_id = $1 and date between $2::date and $3::date
     order by date, start_minute nulls first`,
    [providerId, fromDate, toDate],
  );
}

export function exceptionsMap(rows: ExceptionRow[]): Record<string, Interval[]> {
  const out: Record<string, Interval[]> = {};
  for (const r of rows) {
    out[r.date] ??= [];
    if (r.start_minute != null && r.end_minute != null) out[r.date].push({ start: r.start_minute, end: r.end_minute });
  }
  return out;
}

export interface NewBooking {
  id: string;
  status: "pending" | "confirmed";
  starts_at: Date;
  service_name: string | null;
  client_name: string | null;
}

/** Bookings clients made since the provider last marked them as seen. */
export async function newBookings(q: Queryable, provider: { id: string; bookings_seen_at: Date }): Promise<NewBooking[]> {
  return q.query<NewBooking>(
    `select a.id, a.status, a.starts_at, a.service_name, c.name as client_name
       from appointments a left join clients c on c.id = a.client_id
      where a.provider_id = $1 and a.kind = 'booking' and a.source = 'client'
        and a.status in ('pending', 'confirmed') and a.created_at > $2
      order by a.created_at desc limit 20`,
    [provider.id, provider.bookings_seen_at],
  );
}
