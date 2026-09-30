import { DateTime } from "luxon";
import type { Locale } from "@/i18n/config";

// Every formatter takes the reader's language last, defaulting to English.
function dt(d: Date | string, zone: string, locale: Locale) {
  return DateTime.fromJSDate(new Date(d)).setZone(zone).setLocale(locale === "ru" ? "ru" : "en-US");
}
/** "Tuesday, October 6, 2026" / "вторник, 6 октября 2026" */
export function fmtDate(d: Date | string, zone: string, locale: Locale = "en") {
  return dt(d, zone, locale).toFormat(locale === "ru" ? "cccc, d MMMM yyyy" : "cccc, LLLL d, yyyy");
}
/** "Tue, Oct 6" / "вт, 6 окт." */
export function fmtShortDate(d: Date | string, zone: string, locale: Locale = "en") {
  return dt(d, zone, locale).toFormat(locale === "ru" ? "ccc, d MMM" : "ccc, LLL d");
}
/** "11:15 AM" / "11:15" */
export function fmtTime(d: Date | string, zone: string, locale: Locale = "en") {
  return dt(d, zone, locale).toFormat(locale === "ru" ? "HH:mm" : "h:mm a");
}
export function fmtDateTime(d: Date | string, zone: string, locale: Locale = "en") {
  return `${fmtDate(d, zone, locale)} ${locale === "ru" ? "в" : "at"} ${fmtTime(d, zone, locale)}`;
}
/** Luxon formats for client components that format DateTimes themselves. */
export function luxonFormats(locale: Locale) {
  return locale === "ru"
    ? { luxon: "ru", time: "HH:mm", shortDate: "ccc, d MMM", dayName: "ccc", dayNum: "d", month: "LLLL yyyy", dateAtTime: "ccc, d MMM 'в' HH:mm" }
    : { luxon: "en-US", time: "h:mm a", shortDate: "ccc, LLL d", dayName: "ccc", dayNum: "d", month: "LLLL yyyy", dateAtTime: "ccc, LLL d 'at' h:mm a" };
}
export function fmtZone(zone: string, at: Date = new Date()) {
  const abbr = DateTime.fromJSDate(at).setZone(zone).toFormat("ZZZZ");
  return `${zone.replace(/_/g, " ")} (${abbr})`;
}
export function fmtDuration(min: number, locale: Locale = "en") {
  const [hr, mn] = locale === "ru" ? ["ч", "мин"] : ["hr", "min"];
  if (min < 60) return `${min} ${mn}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ${hr} ${m} ${mn}` : `${h} ${hr}`;
}
export function fmtPrice(cents: number | null | undefined, currency = "USD", locale: Locale = "en") {
  if (cents == null) return null;
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { style: "currency", currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
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
