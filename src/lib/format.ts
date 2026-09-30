import { DateTime } from "luxon";

export function fmtDate(d: Date | string, zone: string) {
  return DateTime.fromJSDate(new Date(d)).setZone(zone).toFormat("cccc, LLLL d, yyyy");
}
export function fmtShortDate(d: Date | string, zone: string) {
  return DateTime.fromJSDate(new Date(d)).setZone(zone).toFormat("ccc, LLL d");
}
export function fmtTime(d: Date | string, zone: string) {
  return DateTime.fromJSDate(new Date(d)).setZone(zone).toFormat("h:mm a");
}
export function fmtDateTime(d: Date | string, zone: string) {
  return `${fmtDate(d, zone)} at ${fmtTime(d, zone)}`;
}
export function fmtZone(zone: string, at: Date = new Date()) {
  const abbr = DateTime.fromJSDate(at).setZone(zone).toFormat("ZZZZ");
  return `${zone.replace(/_/g, " ")} (${abbr})`;
}
export function fmtDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
export function fmtPrice(cents: number | null | undefined, currency = "USD") {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}
export function minutesToHHMM(m: number) {
  if (m === 1440) return "24:00";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v <= 1440 && Number(m[2]) < 60 ? v : null;
}
export function isValidZone(zone: string) {
  return DateTime.local().setZone(zone).isValid;
}
