import { NextResponse } from "next/server";
import { localizeError } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { verifyAccess } from "@/lib/access";
import { availableSlots } from "@/lib/availability";
import { appointmentByToken } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { providerByUsername, servicesFor } from "@/lib/providers";
import { rateLimit, RateLimitError } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";
import { normalizeUsername } from "@/lib/username";

const MAX_WINDOW_MS = 15 * 86_400_000;

function fail(status: number, error: string, req: Request) {
  return NextResponse.json({ error: localizeError(error, localeFromRequest(req)) }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Bookable start times only. Private providers' times are returned only with a valid
 * access link (k) or a manage link (m) for one of their appointments.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("u"));
  const serviceId = url.searchParams.get("service") ?? "";
  const from = new Date(url.searchParams.get("from") ?? "");
  const to = new Date(url.searchParams.get("to") ?? "");
  if (!username || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > MAX_WINDOW_MS) {
    return fail(400, "Bad request.", req);
  }
  const db = await getDb();
  try {
    await rateLimit(db, `slots:${ipFrom(req)}`, 120, 60);
  } catch (e) {
    if (e instanceof RateLimitError) return fail(429, e.message, req);
    throw e;
  }
  const provider = await providerByUsername(db, username);
  if (!provider) return fail(404, "Provider not found.", req);

  let excludeAppointmentId: string | undefined;
  const manage = url.searchParams.get("m");
  if (manage) {
    const m = await appointmentByToken(db, manage);
    if (!m || m.provider.id !== provider.id) return fail(403, "This link isn't valid.", req);
    excludeAppointmentId = m.appointment.id;
  } else if (provider.access_mode === "private") {
    const grant = await verifyAccess(db, provider, url.searchParams.get("k"));
    if (!grant) return fail(403, "Availability is private. Ask for access first.", req);
  }

  const service = (await servicesFor(db, provider.id)).find((s) => s.id === serviceId);
  if (!service) return fail(404, "That service is no longer offered.", req);
  const slots = await availableSlots(db, provider, service, { from, to, excludeAppointmentId });
  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) }, { headers: { "Cache-Control": "no-store" } });
}
