"use server";

import { redirect } from "next/navigation";
import { BookingError, cancelByClient } from "@/lib/booking";

export async function cancelBooking(form: FormData) {
  const token = String(form.get("token") ?? "");
  try {
    await cancelByClient(token);
  } catch (e) {
    if (e instanceof BookingError) redirect(`/b/${token}?err=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/b/${token}?cancelled=1`);
}
