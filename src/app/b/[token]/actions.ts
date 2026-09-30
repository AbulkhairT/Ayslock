"use server";

import { redirect } from "next/navigation";
import { BookingError, cancelByClient } from "@/lib/booking";
import { localizeError } from "@/i18n";
import { getLocale } from "@/i18n/server";

export async function cancelBooking(form: FormData) {
  const token = String(form.get("token") ?? "");
  try {
    await cancelByClient(token);
  } catch (e) {
    if (e instanceof BookingError) redirect(`/b/${token}?err=${encodeURIComponent(localizeError(e.message, await getLocale()))}`);
    throw e;
  }
  redirect(`/b/${token}?cancelled=1`);
}
