import { NextResponse } from "next/server";
import { sweepExpired } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { processDue } from "@/lib/notify";

/**
 * Background job: expire stale pending requests and deliver due notifications.
 * Call every 5 minutes with `Authorization: Bearer $CRON_SECRET` (Vercel Cron, Supabase
 * pg_cron + pg_net, GitHub Actions, or any scheduler). Safe to run concurrently.
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const expired = await sweepExpired(db);
  let total = { sent: 0, previewed: 0, skipped: 0, failed: 0 };
  for (let i = 0; i < 10; i++) {
    const r = await processDue(db, { limit: 50 });
    total = { sent: total.sent + r.sent, previewed: total.previewed + r.previewed, skipped: total.skipped + r.skipped, failed: total.failed + r.failed };
    if (r.sent + r.previewed + r.skipped + r.failed < 50) break;
  }
  return NextResponse.json({ expired, ...total });
}
export const POST = GET;
