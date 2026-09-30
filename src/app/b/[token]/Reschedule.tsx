"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlotPicker } from "@/components/SlotPicker";
import { btn, btnSecondary } from "@/components/ui";
import { useLocale, useT } from "@/i18n/client";
import { luxonFormats } from "@/lib/format";

export function Reschedule(p: { token: string; username: string; serviceId: string; zone: string; horizonDays: number; approval: boolean }) {
  const router = useRouter();
  const dict = useT();
  const t = dict.booking.reschedule;
  const f = luxonFormats(useLocale());
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState(p.zone);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className={`${btnSecondary} w-full`} onClick={() => setOpen(true)}>
        {t.open}
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
    setNotice(data?.error || dict.common.somethingWrong);
    setSlot(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <section aria-labelledby="rs-title" className="space-y-4 border-y border-line py-5">
      <h2 id="rs-title" className="text-xl font-semibold tracking-tight">{t.title}</h2>
      {p.approval && <p className="text-[15px] text-muted">{t.approvalAgain}</p>}
      <SlotPicker username={p.username} serviceId={p.serviceId} zone={zone} onZoneChange={setZone} horizonDays={p.horizonDays} selected={slot} onSelect={setSlot} manageToken={p.token} notice={notice} refreshKey={refreshKey} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className={`${btn} flex-1 py-2 text-center`} disabled={!slot || busy} onClick={save}>
          {busy ? t.saving : slot ? t.moveTo(DateTime.fromISO(slot).setZone(zone).setLocale(f.luxon).toFormat(f.dateAtTime)) : t.pickTime}
        </button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
          {t.keep}
        </button>
      </div>
    </section>
  );
}
