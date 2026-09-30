"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { providerByUsername } from "@/lib/providers";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { normalizeUsername } from "@/lib/username";

export interface LookupState {
  error?: string;
  value?: string;
}

/** Exact-username lookup. There is deliberately no search or listing. */
export async function lookupProvider(_: LookupState, form: FormData): Promise<LookupState> {
  const value = String(form.get("username") ?? "").slice(0, 60);
  const username = normalizeUsername(value);
  if (!value.trim()) return { value, error: "Type your provider's username, like @marco." };
  const db = await getDb();
  try {
    await rateLimit(db, `lookup:${await clientIp()}`, 30, 60);
  } catch (e) {
    return { value, error: (e as Error).message };
  }
  const provider = username ? await providerByUsername(db, username) : null;
  if (!provider) {
    return { value, error: `We couldn't find @${value.trim().replace(/^@+/, "")}. Check the spelling with your provider, or ask them for their link.` };
  }
  redirect(`/u/${provider.username}`);
}
