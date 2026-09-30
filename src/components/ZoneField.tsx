"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { TimezoneSelect } from "./TimezoneSelect";

export function ZoneField({ name, initial, labelText }: { name: string; initial: string; labelText?: string }) {
  const t = useT();
  const [zone, setZone] = useState(initial);
  return (
    <>
      <input type="hidden" name={name} value={zone} />
      <TimezoneSelect value={zone} onChange={setZone} id={`${name}-select`} labelText={labelText ?? t.booking.slots.timezone} />
    </>
  );
}
