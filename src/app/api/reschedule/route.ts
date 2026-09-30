import { NextResponse } from "next/server";
import { localizeError } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { BookingError, rescheduleByClient } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { rateLimit, RateLimitError } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";

export async function POST(req: Request) {
  const L = localeFromRequest(req);
  try {
    const { token, startsAt } = await req.json();
    await rateLimit(await getDb(), `reschedule:${ipFrom(req)}`, 20, 3600);
    const a = await rescheduleByClient(String(token), String(startsAt));
    return NextResponse.json({ ok: true, status: a.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: localizeError(e.message, L), code: e.code }, { status: e.code === "not_found" ? 404 : 409 });
    if (e instanceof RateLimitError) return NextResponse.json({ error: localizeError(e.message, L) }, { status: 429 });
    console.error(e);
    return NextResponse.json({ error: localizeError("Something went wrong. Please try again.", L) }, { status: 500 });
  }
}
