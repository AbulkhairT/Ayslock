import { describe, expect, it } from "vitest";
import { generateSlots, localToUtc, type SlotInput } from "../src/lib/slots";

const base = (over: Partial<SlotInput>): SlotInput => ({
  // Defaults: New York provider open Mondays 10:00–12:00.
  timezone: "America/New_York",
  weekly: { 1: [{ start: 600, end: 720 }] },
  exceptions: {},
  busy: [],
  durationMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 0,
  horizonDays: 60,
  now: new Date("2026-01-01T00:00:00Z"),
  from: new Date("2026-01-05T00:00:00Z"),
  to: new Date("2026-01-06T00:00:00Z"),
  ...over,
});
const iso = (d: Date[]) => d.map((x) => x.toISOString());

describe("slot generation", () => {
  it("only offers slots whose whole duration fits in working hours", () => {
    // Monday Jan 5 2026, 10:00–12:00 New York (UTC-5)
    const s = generateSlots(base({ durationMinutes: 45 }));
    expect(iso(s)).toEqual(["2026-01-05T15:00:00.000Z", "2026-01-05T15:30:00.000Z", "2026-01-05T16:00:00.000Z"]);
    // 11:30 would end at 12:15, past closing, so it's excluded
  });

  it("skips breaks (gaps between intervals)", () => {
    const s = generateSlots(base({ weekly: { 1: [{ start: 600, end: 660 }, { start: 720, end: 780 }] }, durationMinutes: 60 }));
    expect(iso(s)).toEqual(["2026-01-05T15:00:00.000Z", "2026-01-05T17:00:00.000Z"]);
  });

  it("respects existing appointments plus buffer on both sides", () => {
    const busy = [{ start: new Date("2026-01-05T16:00:00Z"), until: new Date("2026-01-05T16:40:00Z") }]; // 11:00–11:30 +10 buffer
    const s = generateSlots(base({ busy, bufferMinutes: 10 }));
    // 10:00 ok (ends 10:30+10 = 10:40); 10:30 ends 11:00+10 overlaps 11:00; 11:00 busy; 11:30 starts before 11:40
    expect(iso(s)).toEqual(["2026-01-05T15:00:00.000Z"]);
  });

  it("applies minimum notice and booking horizon", () => {
    const now = new Date("2026-01-05T15:10:00Z"); // 10:10 local
    expect(iso(generateSlots(base({ now, minNoticeMinutes: 60 })))).toEqual(["2026-01-05T16:30:00.000Z"]);
    expect(generateSlots(base({ now: new Date("2025-12-01T00:00:00Z"), horizonDays: 30 }))).toEqual([]);
  });

  it("date exceptions replace weekly hours (closed or special hours)", () => {
    expect(generateSlots(base({ exceptions: { "2026-01-05": [] } }))).toEqual([]);
    const special = generateSlots(base({ exceptions: { "2026-01-05": [{ start: 1080, end: 1110 }] } }));
    expect(iso(special)).toEqual(["2026-01-05T23:00:00.000Z"]);
  });
});

describe("timezones and daylight saving", () => {
  it("keeps local wall-clock hours across the US spring-forward change", () => {
    const weekly = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, [{ start: 600, end: 630 }]]));
    const s = generateSlots(base({ horizonDays: 365, weekly, from: new Date("2026-03-07T00:00:00Z"), to: new Date("2026-03-10T00:00:00Z") }));
    // Mar 7 and 8 straddle the switch on Mar 8 at 2am: 10:00 EST = 15:00Z, 10:00 EDT = 14:00Z
    expect(iso(s)).toEqual(["2026-03-07T15:00:00.000Z", "2026-03-08T14:00:00.000Z", "2026-03-09T14:00:00.000Z"]);
  });

  it("never offers a start time that does not exist (skipped hour)", () => {
    expect(localToUtc("2026-03-08", 150, "America/New_York")).toBeNull(); // 02:30 doesn't exist
    const s = generateSlots(base({ horizonDays: 365, weekly: { 7: [{ start: 60, end: 240 }] }, durationMinutes: 30, stepMinutes: 30, from: new Date("2026-03-08T00:00:00Z"), to: new Date("2026-03-09T00:00:00Z") }));
    // 01:00 and 01:30 EST, then 03:00 and 03:30 EDT. The window is only 2 real hours long.
    expect(iso(s)).toEqual(["2026-03-08T06:00:00.000Z", "2026-03-08T06:30:00.000Z", "2026-03-08T07:00:00.000Z", "2026-03-08T07:30:00.000Z"]);
  });

  it("handles fall-back day: 60-minute services still take 60 real minutes", () => {
    const s = generateSlots(base({ horizonDays: 365, weekly: { 7: [{ start: 540, end: 660 }] }, durationMinutes: 60, from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-02T00:00:00Z") }));
    // Nov 1 2026 is the fall-back Sunday; 09:00 EST = 14:00Z
    expect(iso(s)).toEqual(["2026-11-01T14:00:00.000Z", "2026-11-01T14:30:00.000Z", "2026-11-01T15:00:00.000Z"]);
  });

  it("works for providers east of UTC across the date line of the client", () => {
    const s = generateSlots(base({ horizonDays: 365, timezone: "Asia/Tokyo", weekly: { 2: [{ start: 540, end: 600 }] }, durationMinutes: 60, from: new Date("2026-01-05T00:00:00Z"), to: new Date("2026-01-07T00:00:00Z") }));
    // Tuesday 09:00 Tokyo = Monday 00:00 UTC
    expect(iso(s)).toEqual(["2026-01-06T00:00:00.000Z"]);
  });
});
