"use server";

import { revalidatePath } from "next/cache";
import { sweepExpired } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { processDue } from "@/lib/notify";

function guard() {
  if (!(modes.auth === "demo" && modes.email === "preview")) throw new Error("Demo only.");
}

export async function runWorker() {
  guard();
  const db = await getDb();
  await sweepExpired(db);
  await processDue(db);
  revalidatePath("/demo/outbox");
}

/** Demo-only time travel: make one queued reminder due now, then run the real worker. */
export async function fastForward(form: FormData) {
  guard();
  const db = await getDb();
  await db.query(`update notifications set send_after = now() where id = $1 and status = 'queued'`, [String(form.get("id"))]);
  await processDue(db);
  revalidatePath("/demo/outbox");
}
