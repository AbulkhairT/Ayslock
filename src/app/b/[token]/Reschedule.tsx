"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlotPicker } from "@/components/SlotPicker";
import { btn, btnSecondary } from "@/components/ui";

export function Reschedule(p: { token: string; username: string; serviceId: string; zone: string; horizonDays: number; approval: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState(p.zone);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className={`${btnSecondary} w-full`} onClick={() => setOpen(true)}>
        Reschedule
      </button>
    );
  }

  async function save() {
    if (!slot) return;
    setBusy(true);
    const res = await fetch("/api/reschedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: p.token, startsAt: slot }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) {
      setOpen(false);
      router.replace(`/b/${p.token}?moved=1`);
      router.refresh();
      return;
    }
    setNotice(data?.error || "Something went wrong. Please try again.");
    setSlot(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <section aria-labelledby="rs-title" className="space-y-4 border-y border-line py-5">
      <h2 id="rs-title" className="text-xl font-semibold tracking-tight">Pick a new time</h2>
      {p.approval && <p className="text-[15px] text-muted">The new time needs approval again. Until then it shows as pending.</p>}
      <SlotPicker username={p.username} serviceId={p.serviceId} zone={zone} onZoneChange={setZone} horizonDays={p.horizonDays} selected={slot} onSelect={setSlot} manageToken={p.token} notice={notice} refreshKey={refreshKey} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className={`${btn} flex-1`} disabled={!slot || busy} onClick={save}>
          {busy ? "Saving…" : slot ? `Move to ${DateTime.fromISO(slot).setZone(zone).toFormat("ccc, LLL d 'at' h:mm a")}` : "Pick a time"}
        </button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
          Keep current time
        </button>
      </div>
    </section>
  );
}
