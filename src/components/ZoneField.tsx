"use client";

import { useState } from "react";
import { TimezoneSelect } from "./TimezoneSelect";

export function ZoneField({ name, initial }: { name: string; initial: string }) {
  const [zone, setZone] = useState(initial);
  return (
    <>
      <input type="hidden" name={name} value={zone} />
      <TimezoneSelect value={zone} onChange={setZone} id={`${name}-select`} labelText="Timezone" />
    </>
  );
}
