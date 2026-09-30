import { DEFAULT_LOCALE, type Locale } from "./config";
import { auth } from "./dict/auth";
import { booking } from "./dict/booking";
import { common } from "./dict/common";
import { dashboard } from "./dict/dashboard";
import { emails } from "./dict/emails";
import { errors } from "./dict/errors";
import { home } from "./dict/home";
import { onboarding } from "./dict/onboarding";

export { plural } from "./plural";
export type { Locale } from "./config";

/** Every string on the site, in one language. Russian has to have exactly the same keys as English. */
export function getDict(locale: Locale) {
  return {
    locale,
    common: common[locale],
    home: home[locale],
    booking: booking[locale],
    auth: auth[locale],
    onboarding: onboarding[locale],
    dashboard: dashboard[locale],
    emails: emails[locale],
    errors: errors[locale],
  };
}
export type Dict = ReturnType<typeof getDict>;

/**
 * Library code throws the English text from `errors` (so logs and tests read naturally).
 * Show it to people through this: it swaps a known English message for its translation.
 */
export function localizeError(message: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !message) return message;
  const en = errors.en as Record<string, unknown>;
  const tr = errors[locale] as Record<string, unknown>;
  for (const key of Object.keys(en)) {
    const v = en[key];
    if (v === message && typeof tr[key] === "string") return tr[key] as string;
  }
  return message;
}
