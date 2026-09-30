"use client";

import { useState } from "react";
import { WEEKDAYS, type DayHours } from "@/lib/hours";

const timeInput = "min-h-11 w-full rounded-xl border border-line bg-white px-2 text-sm focus:border-accent focus:outline-none disabled:bg-canvas disabled:text-muted/60";

/** Weekly hours with an optional break per day. Posts d{n}_open/_start/_end/_bstart/_bend. */
export function HoursEditor({ initial }: { initial: Record<number, DayHours> }) {
  const [days, setDays] = useState(initial);
  const set = (n: number, patch: Partial<DayHours>) => setDays((d) => ({ ...d, [n]: { ...d[n], ...patch } }));
  const copyToWeekdays = (n: number) =>
    setDays((d) => {
      const next = { ...d };
      for (const w of WEEKDAYS) if (next[w.n].open && w.n !== n) next[w.n] = { ...d[n] };
      return next;
    });

  return (
    <div className="space-y-3">
      {WEEKDAYS.map((w) => {
        const d = days[w.n];
        return (
          <fieldset key={w.n} className="rounded-2xl border border-line p-3">
            <legend className="sr-only">{w.long}</legend>
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-3 font-semibold">
                <input type="checkbox" name={`d${w.n}_open`} checked={d.open} onChange={(e) => set(w.n, { open: e.target.checked })} className="h-5 w-5 accent-[var(--color-accent)]" />
                {w.long}
              </label>
              {d.open ? (
                <button type="button" onClick={() => copyToWeekdays(w.n)} className="min-h-11 px-2 text-xs font-semibold text-accent">
                  Copy to open days
                </button>
              ) : (
                <span className="text-sm text-muted">Closed</span>
              )}
            </div>
            {d.open && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-xs font-semibold text-muted">
                  Start
                  <input type="time" name={`d${w.n}_start`} value={d.start} onChange={(e) => set(w.n, { start: e.target.value })} className={timeInput} required />
                </label>
                <label className="text-xs font-semibold text-muted">
                  End
                  <input type="time" name={`d${w.n}_end`} value={d.end} onChange={(e) => set(w.n, { end: e.target.value })} className={timeInput} required />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Break from <span className="font-normal">(optional)</span>
                  <input type="time" name={`d${w.n}_bstart`} value={d.breakStart} onChange={(e) => set(w.n, { breakStart: e.target.value })} className={timeInput} />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Break until
                  <input type="time" name={`d${w.n}_bend`} value={d.breakEnd} onChange={(e) => set(w.n, { breakEnd: e.target.value })} className={timeInput} />
                </label>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
