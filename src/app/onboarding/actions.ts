"use server";

import { redirect } from "next/navigation";
import { getDb, pgCode } from "@/lib/db";
import { parseHoursForm } from "@/lib/hours";
import { formObject, priceToCents, profileSchema, serviceSchema } from "@/lib/profile";
import { providerByOwner } from "@/lib/providers";
import { requireUser } from "@/lib/session";
import { getDict, localizeError } from "@/i18n";
import { getLocale } from "@/i18n/server";

export interface OnboardState {
  error?: string;
  step?: number;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export async function createProfile(_: OnboardState, form: FormData): Promise<OnboardState> {
  const user = await requireUser();
  const db = await getDb();
  if (await providerByOwner(db, user.id)) redirect("/dashboard");
  const locale = await getLocale();
  const t = getDict(locale).onboarding.errors;

  const profile = profileSchema.safeParse(formObject(form, ["display_name", "username", "timezone", "profession", "bio", "location_kind", "location_text", "avatar_url"]));
  if (!profile.success) return { error: localizeError(profile.error.issues[0].message, locale), step: 1 };

  let rawServices: unknown[] = [];
  try {
    rawServices = JSON.parse(String(form.get("services") ?? "[]"));
  } catch {
    return { error: t.addService, step: 2 };
  }
  const services: { name: string; description: string; duration_minutes: number; price_cents: number | null }[] = [];
  for (const r of rawServices) {
    const s = serviceSchema.safeParse(r);
    if (!s.success) return { error: localizeError(s.error.issues[0].message, locale), step: 2 };
    const cents = priceToCents(s.data.price);
    if (cents === "invalid") return { error: t.checkPrice(s.data.name), step: 2 };
    services.push({ ...s.data, price_cents: cents });
  }
  if (!services.length) return { error: t.addService, step: 2 };
  const currency = CURRENCIES.includes(String(form.get("currency"))) ? String(form.get("currency")) : "USD";

  const hours = parseHoursForm(form, locale);
  if ("error" in hours) return { error: hours.error, step: 3 };

  const p = profile.data;
  try {
    await db.tx(async (q) => {
      const [row] = await q.query<{ id: string }>(
        `insert into providers (owner_id, email, username, display_name, bio, avatar_url, timezone, location_kind, location_text, profession, locale)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
        [user.id, user.email, p.username, p.display_name, p.bio, p.avatar_url || null, p.timezone, p.location_kind, p.location_text, p.profession, locale],
      );
      for (const [i, s] of services.entries()) {
        await q.query(
          `insert into services (provider_id, name, description, duration_minutes, price_cents, currency, position) values ($1, $2, $3, $4, $5, $6, $7)`,
          [row.id, s.name, s.description, s.duration_minutes, s.price_cents, currency, i],
        );
      }
      for (const [day, ivs] of Object.entries(hours.hours)) {
        for (const iv of ivs) {
          await q.query(`insert into weekly_hours (provider_id, weekday, start_minute, end_minute) values ($1, $2, $3, $4)`, [row.id, Number(day), iv.start, iv.end]);
        }
      }
    });
  } catch (e) {
    // The unique index decides races between two people claiming the same name.
    if (pgCode(e) === "23505" && String((e as { constraint?: string }).constraint ?? "").includes("owner")) redirect("/dashboard");
    if (pgCode(e) === "23505") return { error: t.taken(p.username), step: 1 };
    throw e;
  }
  redirect("/dashboard/ready");
}
