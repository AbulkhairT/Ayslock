import { hhmmToMinutes } from "./format";
import type { Interval } from "./slots";

export const WEEKDAYS = [
  { n: 1, short: "Mon", long: "Monday" },
  { n: 2, short: "Tue", long: "Tuesday" },
  { n: 3, short: "Wed", long: "Wednesday" },
  { n: 4, short: "Thu", long: "Thursday" },
  { n: 5, short: "Fri", long: "Friday" },
  { n: 6, short: "Sat", long: "Saturday" },
  { n: 7, short: "Sun", long: "Sunday" },
];

export interface DayHours {
  open: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

export const DEFAULT_HOURS: Record<number, DayHours> = Object.fromEntries(
  WEEKDAYS.map((d) => [d.n, { open: d.n <= 5, start: "10:00", end: "19:00", breakStart: "", breakEnd: "" }]),
);

/** Parse the hours editor fields (d{n}_open, d{n}_start, d{n}_end, d{n}_bstart, d{n}_bend). */
export function parseHoursForm(form: FormData): { hours: Record<number, Interval[]> } | { error: string } {
  const hours: Record<number, Interval[]> = {};
  for (const d of WEEKDAYS) {
    if (!form.get(`d${d.n}_open`)) continue;
    const s = hhmmToMinutes(String(form.get(`d${d.n}_start`) ?? ""));
    const e = hhmmToMinutes(String(form.get(`d${d.n}_end`) ?? ""));
    if (s == null || e == null || e <= s) return { error: `${d.long}: the end time must be after the start time.` };
    const bsRaw = String(form.get(`d${d.n}_bstart`) ?? "").trim();
    const beRaw = String(form.get(`d${d.n}_bend`) ?? "").trim();
    if (bsRaw || beRaw) {
      const bs = hhmmToMinutes(bsRaw);
      const be = hhmmToMinutes(beRaw);
      if (bs == null || be == null || be <= bs) return { error: `${d.long}: the break needs a start and a later end.` };
      if (bs <= s || be >= e) return { error: `${d.long}: the break must be inside working hours.` };
      hours[d.n] = [{ start: s, end: bs }, { start: be, end: e }];
    } else {
      hours[d.n] = [{ start: s, end: e }];
    }
  }
  if (!Object.keys(hours).length) return { error: "Open at least one day a week." };
  return { hours };
}

/** Turn stored intervals back into editor rows (first interval start, last end, first gap as break). */
export function toDayHours(weekly: Record<number, Interval[]>, fmt: (m: number) => string): Record<number, DayHours> {
  const out: Record<number, DayHours> = {};
  for (const d of WEEKDAYS) {
    const iv = weekly[d.n];
    if (!iv?.length) out[d.n] = { open: false, start: "10:00", end: "19:00", breakStart: "", breakEnd: "" };
    else
      out[d.n] = {
        open: true,
        start: fmt(iv[0].start),
        end: fmt(iv[iv.length - 1].end),
        breakStart: iv.length > 1 ? fmt(iv[0].end) : "",
        breakEnd: iv.length > 1 ? fmt(iv[1].start) : "",
      };
  }
  return out;
}
