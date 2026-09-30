import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "../src/i18n/config";
import { getDict, localizeError, plural } from "../src/i18n";
import { errors } from "../src/i18n/dict/errors";
import { fmtDate, fmtDuration, fmtPrice, fmtTime } from "../src/lib/format";

describe("language detection", () => {
  it("follows the browser's order and falls back to English", () => {
    expect(localeFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,ru;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("de-DE,ru;q=0.5")).toBe("ru");
    expect(localeFromAcceptLanguage("kk-KZ")).toBe("ru");
    expect(localeFromAcceptLanguage("fr-FR,de;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("en;q=0.2,ru;q=0.9")).toBe("ru");
    expect(localeFromAcceptLanguage(undefined)).toBe("en");
  });
});

describe("formatting", () => {
  const at = new Date("2026-10-06T09:15:00Z");
  it("uses Russian dates, 24-hour time, units and money", () => {
    expect(fmtDate(at, "Europe/Moscow", "ru")).toBe("вторник, 6 октября 2026");
    expect(fmtTime(at, "Europe/Moscow", "ru")).toBe("12:15");
    expect(fmtTime(at, "Europe/Moscow", "en")).toBe("12:15 PM");
    expect(fmtDuration(90, "ru")).toBe("1 ч 30 мин");
    expect(fmtPrice(350000, "RUB", "ru")?.replace(/\s/g, " ")).toBe("3 500 ₽");
  });
  it("picks Russian plural forms", () => {
    const f = { one: "минута", few: "минуты", many: "минут", other: "минуты" };
    expect([1, 2, 5, 21, 22, 25].map((n) => plural("ru", n, f))).toEqual(["минута", "минуты", "минут", "минута", "минуты", "минут"]);
  });
});

describe("error messages", () => {
  it("translates known English messages and leaves others alone", () => {
    expect(localizeError("Someone just booked that time. Please pick another one.", "ru")).toBe(getDict("ru").errors.slotTaken);
    expect(localizeError("Someone just booked that time. Please pick another one.", "en")).toContain("Someone");
    expect(localizeError("Totally unknown.", "ru")).toBe("Totally unknown.");
  });

  it("has a translation for every message thrown by the library and API code", () => {
    const known = new Set(Object.values(errors.en).filter((v) => typeof v === "string"));
    const files = ["src/lib/booking.ts", "src/lib/access.ts", "src/lib/auth.ts", "src/lib/username.ts", "src/lib/profile.ts", "src/lib/ratelimit.ts",
      "src/app/api/book/route.ts", "src/app/api/slots/route.ts", "src/app/api/reschedule/route.ts", "src/app/api/access-request/route.ts"];
    const missing: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(process.cwd(), f), "utf8");
      const found = [
        ...src.matchAll(/(?:Error\([^,]*?,?\s*|error: |fail\(\d+, |return |, )"([A-Z][^"]{5,}[.!?])"/g),
        ...src.matchAll(/(?:min|max|email|refine)\([^)]*?"([A-Z][^"]{5,}[.!?])"/g),
      ].map((m) => m[1]);
      for (const msg of found) if (!known.has(msg)) missing.push(`${f}: ${msg}`);
    }
    expect(missing).toEqual([]);
  });
});
