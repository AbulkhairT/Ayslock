import { DateTime } from "luxon";

export interface Interval {
  start: number; // minutes from local midnight
  end: number;
}

export interface BusyRange {
  start: Date; // UTC instant
  until: Date; // occupied until (end + buffer at booking time)
}

export interface SlotInput {
  timezone: string; // provider IANA timezone
  weekly: Record<number, Interval[]>; // ISO weekday 1..7 -> local intervals
  exceptions: Record<string, Interval[]>; // 'yyyy-MM-dd' -> intervals (empty = closed)
  busy: BusyRange[];
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  horizonDays: number;
  now: Date;
  from: Date; // UTC window start (inclusive)
  to: Date; // UTC window end (exclusive)
  stepMinutes?: number;
}

/** Convert a provider-local wall time to a UTC instant. Returns null for times skipped by DST. */
export function localToUtc(date: string, minute: number, zone: string): DateTime | null {
  const [y, m, d] = date.split("-").map(Number);
  const hour = Math.floor(minute / 60);
  const min = minute % 60;
  if (minute === 1440) {
    // End of day: midnight of the next local date.
    const next = DateTime.fromObject({ year: y, month: m, day: d }, { zone }).plus({ days: 1 }).startOf("day");
    return next.isValid ? next : null;
  }
  const dt = DateTime.fromObject({ year: y, month: m, day: d, hour, minute: min }, { zone });
  if (!dt.isValid) return null;
  // Luxon shifts nonexistent wall times forward; treat those as unavailable.
  if (dt.hour !== hour || dt.minute !== min || dt.day !== d) return null;
  return dt;
}

/** Local open intervals for a provider date, after applying exceptions. */
export function intervalsFor(date: string, input: Pick<SlotInput, "timezone" | "weekly" | "exceptions">): Interval[] {
  if (date in input.exceptions) return input.exceptions[date];
  const weekday = DateTime.fromISO(date, { zone: input.timezone }).weekday;
  return input.weekly[weekday] ?? [];
}

/** Resolve a local interval to UTC. A boundary inside a DST gap moves to the gap's end. */
function intervalToUtc(date: string, iv: Interval, zone: string): { start: number; end: number } | null {
  const resolve = (minute: number) => {
    for (let m = minute; m <= Math.min(minute + 120, 1440); m++) {
      const dt = localToUtc(date, m, zone);
      if (dt) return dt.toMillis();
    }
    return null;
  };
  const start = resolve(iv.start);
  const end = resolve(iv.end);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

/**
 * Bookable start times (UTC) for one service.
 * A slot is offered only if the whole service fits inside open hours, it respects the
 * minimum notice and booking horizon, and [start, end + buffer) overlaps no busy range.
 */
export function generateSlots(input: SlotInput): Date[] {
  const step = input.stepMinutes ?? (input.durationMinutes < 30 ? 15 : 30);
  const zone = input.timezone;
  const durMs = input.durationMinutes * 60_000;
  const bufMs = input.bufferMinutes * 60_000;
  const earliest = input.now.getTime() + input.minNoticeMinutes * 60_000;
  const latest = input.now.getTime() + input.horizonDays * 86_400_000;
  const fromMs = Math.max(input.from.getTime(), earliest);
  const toMs = Math.min(input.to.getTime(), latest);
  if (toMs <= fromMs) return [];

  const busy = input.busy.map((b) => ({ s: b.start.getTime(), u: b.until.getTime() })).sort((a, b) => a.s - b.s);

  // Walk provider-local dates that could contain slots in [fromMs, toMs).
  let day = DateTime.fromMillis(fromMs, { zone }).startOf("day").minus({ days: 1 });
  const lastDay = DateTime.fromMillis(toMs, { zone }).startOf("day").plus({ days: 1 });
  const out: number[] = [];
  const seen = new Set<number>();

  while (day <= lastDay) {
    const date = day.toISODate()!;
    for (const iv of intervalsFor(date, input)) {
      const open = intervalToUtc(date, iv, zone);
      if (!open) continue;
      for (let m = iv.start; m + input.durationMinutes <= iv.end + 120; m += step) {
        const startDt = localToUtc(date, m, zone);
        if (!startDt) continue; // wall time does not exist (spring forward)
        const s = startDt.toMillis();
        const e = s + durMs;
        if (s < open.start || e > open.end) continue;
        if (s < fromMs || s >= toMs) continue;
        if (seen.has(s)) continue;
        const occupiedUntil = e + bufMs;
        const clash = busy.some((b) => s < b.u && occupiedUntil > b.s);
        if (clash) continue;
        seen.add(s);
        out.push(s);
      }
    }
    day = day.plus({ days: 1 });
  }
  return out.sort((a, b) => a - b).map((ms) => new Date(ms));
}
