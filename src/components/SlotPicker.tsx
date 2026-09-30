"use client";

import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { luxonFormats } from "@/lib/format";
import { TimezoneSelect } from "./TimezoneSelect";

export interface SlotPickerProps {
  username: string;
  serviceId: string;
  zone: string;
  onZoneChange: (z: string) => void;
  horizonDays: number;
  selected: string | null;
  onSelect: (iso: string) => void;
  accessToken?: string | null;
  manageToken?: string | null;
  notice?: string | null;
  refreshKey?: number;
}

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; slots: string[] };

export function SlotPicker(p: SlotPickerProps) {
  const t = useT().booking;
  const s = t.slots;
  const f = luxonFormats(useLocale());
  const loadError = s.loadError;
  const [week, setWeek] = useState(0);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [day, setDay] = useState<string | null>(null);
  const maxWeeks = Math.max(1, Math.ceil(p.horizonDays / 7));

  const weekStart = useMemo(() => DateTime.now().setZone(p.zone).setLocale(f.luxon).startOf("day").plus({ weeks: week }), [p.zone, week, f.luxon]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })), [weekStart]);

  const fetchSlots = useCallback(async () => {
    setLoad({ state: "loading" });
    const qs = new URLSearchParams({
      u: p.username,
      service: p.serviceId,
      from: weekStart.toUTC().toISO()!,
      to: weekStart.plus({ days: 7 }).toUTC().toISO()!,
    });
    if (p.accessToken) qs.set("k", p.accessToken);
    if (p.manageToken) qs.set("m", p.manageToken);
    try {
      const res = await fetch(`/api/slots?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || loadError);
      setLoad({ state: "ready", slots: data.slots });
    } catch (e) {
      setLoad({ state: "error", message: (e as Error).message || loadError });
    }
  }, [p.username, p.serviceId, p.accessToken, p.manageToken, weekStart, loadError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on input change
    fetchSlots();
  }, [fetchSlots, p.refreshKey]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    if (load.state !== "ready") return m;
    for (const iso of load.slots) {
      const key = DateTime.fromISO(iso).setZone(p.zone).toISODate()!;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(iso);
    }
    return m;
  }, [load, p.zone]);

  const firstDayWithSlots = days.find((d) => byDay.has(d.toISODate()!))?.toISODate() ?? null;
  const activeDay = day && byDay.has(day) ? day : firstDayWithSlots;
  const times = activeDay ? byDay.get(activeDay) ?? [] : [];

  return (
    <div className="space-y-4">
      <TimezoneSelect value={p.zone} onChange={p.onZoneChange} />
      {p.notice && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-[15px] font-medium text-warn">
          {p.notice}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="min-h-11 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft disabled:bg-transparent disabled:text-muted/50" disabled={week === 0} onClick={() => setWeek((w) => w - 1)} aria-label={s.prevWeek}>
          {s.earlier}
        </button>
        <p className="text-[15px] font-semibold" aria-live="polite">
          {days[0].toFormat(t.fmt.rangeStart)} – {days[6].toFormat(t.fmt.rangeEnd)}
        </p>
        <button type="button" className="min-h-11 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft disabled:bg-transparent disabled:text-muted/50" disabled={week >= maxWeeks - 1} onClick={() => setWeek((w) => w + 1)} aria-label={s.nextWeek}>
          {s.later}
        </button>
      </div>
      <div role="radiogroup" aria-label={s.chooseDay} className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = d.toISODate()!;
          const has = byDay.has(key);
          const active = key === activeDay;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!has}
              onClick={() => setDay(key)}
              aria-label={`${d.toFormat(t.fmt.dayLong)}${has ? "" : s.noTimesSuffix}`}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl border text-center transition-colors ${
                active ? "border-accent bg-accent text-white" : has ? "border-line bg-surface hover:border-accent" : "border-transparent bg-transparent text-muted/40"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide">{d.toFormat(f.dayName)}</span>
              <span className="text-lg font-semibold tabular-nums">{d.day}</span>
            </button>
          );
        })}
      </div>

      {load.state === "loading" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true" aria-label={s.loading}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-canvas" />
          ))}
        </div>
      )}
      {load.state === "error" && (
        <div role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">
          {load.message}{" "}
          <button type="button" onClick={fetchSlots} className="font-semibold underline">
            {s.tryAgain}
          </button>
        </div>
      )}
      {load.state === "ready" && !activeDay && (
        <div className="border-y border-line px-4 py-8 text-center">
          <p className="font-semibold">{s.noneThisWeek}</p>
          {week < maxWeeks - 1 ? (
            <button type="button" onClick={() => setWeek((w) => w + 1)} className="mt-2 min-h-11 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft">
              {s.checkNext}
            </button>
          ) : (
            <p className="mt-1 text-sm text-muted">{s.horizon}</p>
          )}
        </div>
      )}
      {load.state === "ready" && activeDay && (
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold">{DateTime.fromISO(activeDay, { zone: p.zone, locale: f.luxon }).toFormat(t.fmt.dayLong)}</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {times.map((slot) => {
              const on = slot === p.selected;
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={on}
                  onClick={() => p.onSelect(slot)}
                  className={`min-h-12 rounded-xl border text-base font-medium tabular-nums transition-colors ${on ? "border-accent bg-accent font-semibold text-white" : "border-line bg-surface hover:border-accent"}`}
                >
                  {DateTime.fromISO(slot).setZone(p.zone).setLocale(f.luxon).toFormat(f.time)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
