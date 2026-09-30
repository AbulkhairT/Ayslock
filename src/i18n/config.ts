export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ru";
}

// Languages whose speakers usually read Russian more easily than English.
const RU_FAMILY = new Set(["ru", "be", "kk", "ky", "tg"]);

/** Pick a language from an Accept-Language header, by the browser's own order of preference. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) {
    if (p.lang === "en") return "en";
    if (RU_FAMILY.has(p.lang)) return "ru";
  }
  return DEFAULT_LOCALE;
}

/** BCP 47 tag for Intl and Luxon. */
export function intlTag(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "en-US";
}
