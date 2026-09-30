"use client";

import { useMemo } from "react";

export function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function TimezoneSelect({ value, onChange, id = "tz", labelText = "Times shown in" }: { value: string; onChange: (z: string) => void; id?: string; labelText?: string }) {
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      list = [];
    }
    if (!list.includes(value)) list = [value, ...list];
    if (!list.includes("UTC")) list.push("UTC");
    return list;
  }, [value]);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted">
        {labelText}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 max-w-full rounded-xl border border-line bg-surface px-3 text-sm font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
