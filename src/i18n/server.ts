import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { getDict } from "./index";

/** The visitor's language: their saved choice, else their browser's, else English. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

export async function getT() {
  return getDict(await getLocale());
}

/** Same, for route handlers that only have the Request. */
export function localeFromRequest(req: Request): Locale {
  const m = /(?:^|;\s*)lang=(en|ru)(?:;|$)/.exec(req.headers.get("cookie") ?? "");
  if (m && isLocale(m[1])) return m[1];
  return localeFromAcceptLanguage(req.headers.get("accept-language"));
}
