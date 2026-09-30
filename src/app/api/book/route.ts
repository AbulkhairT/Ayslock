import { NextResponse } from "next/server";
import { localizeError } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { BookingError, createBooking } from "@/lib/booking";
import { RateLimitError } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";

export async function POST(req: Request) {
  const L = localeFromRequest(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: localizeError("Bad request.", L) }, { status: 400 });
  }
  try {
    // Emails to this client go out in the language they booked in.
    const withLocale = body && typeof body === "object" ? { ...(body as object), locale: L } : body;
    const result = await createBooking(withLocale, { ip: ipFrom(req) });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof BookingError) {
      const status = { slot_taken: 409, not_available: 409, not_found: 404, forbidden: 403, invalid: 400, expired: 409 }[e.code];
      return NextResponse.json({ error: localizeError(e.message, L), code: e.code }, { status });
    }
    if (e instanceof RateLimitError) return NextResponse.json({ error: localizeError(e.message, L) }, { status: 429 });
    console.error(e);
    return NextResponse.json({ error: localizeError("Something went wrong. Please try again.", L) }, { status: 500 });
  }
}
