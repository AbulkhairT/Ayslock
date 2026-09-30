import type { Locale } from "./config";

export interface PluralForms {
  one: string;
  few?: string; // Russian 2–4
  many?: string; // Russian 5–20
  other: string;
}

/** Pick a plural form: plural("ru", 3, { one: "минута", few: "минуты", many: "минут", other: "минуты" }). */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const cat = new Intl.PluralRules(locale === "ru" ? "ru-RU" : "en-US").select(n);
  return (forms as unknown as Record<string, string | undefined>)[cat] ?? forms.other;
}
