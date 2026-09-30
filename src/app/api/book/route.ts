import { NextResponse } from "next/server";
import { BookingError, createBooking } from "@/lib/booking";
import { RateLimitError } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const result = await createBooking(body, { ip: ipFrom(req) });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof BookingError) {
      const status = { slot_taken: 409, not_available: 409, not_found: 404, forbidden: 403, invalid: 400, expired: 409 }[e.code];
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
