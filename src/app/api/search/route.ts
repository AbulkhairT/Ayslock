import { NextResponse } from "next/server";
import { localizeError } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";
import { searchProviders } from "@/lib/search";

export const dynamic = "force-dynamic";

/** Live results for the home page search box. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const db = await getDb();
  try {
    await rateLimit(db, `search:${ipFrom(req)}`, 120, 60);
  } catch (e) {
    return NextResponse.json({ error: localizeError((e as Error).message, localeFromRequest(req)) }, { status: 429 });
  }
  const results = await searchProviders(db, q);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
