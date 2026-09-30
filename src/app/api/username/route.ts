import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { providerByUsername } from "@/lib/providers";
import { rateLimit, RateLimitError } from "@/lib/ratelimit";
import { ipFrom } from "@/lib/request";
import { usernameProblem } from "@/lib/username";

/** Is this username free to claim? Used by the claim box as people type. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  const username = raw.trim().replace(/^@+/, "").toLowerCase().slice(0, 40);
  const problem = usernameProblem(username);
  if (problem) return NextResponse.json({ username, available: false, reason: problem });
  const db = await getDb();
  try {
    await rateLimit(db, `username:${ipFrom(req)}`, 60, 60);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ username, available: false, reason: e.message }, { status: 429 });
    throw e;
  }
  const taken = await providerByUsername(db, username);
  return NextResponse.json({ username, available: !taken, reason: taken ? `@${username} is taken. Try another.` : null });
}
