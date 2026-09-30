"use server";

import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LOCALE_COOKIE, isLocale } from "./config";

/** Remember the language for this browser, and for a signed-in provider's emails too. */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await currentUser().catch(() => null);
  if (user) await (await getDb()).query(`update providers set locale = $2 where owner_id = $1`, [user.id, locale]);
}
