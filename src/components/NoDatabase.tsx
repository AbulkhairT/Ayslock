import { demoStorage } from "@/lib/demo-storage";
import { modes } from "@/lib/env";
import { getT } from "@/i18n/server";

/** True when the app runs on a host that can't keep a local database between requests. */
export function noSharedDatabase() {
  return modes.db === "pglite" && demoStorage().ephemeral;
}

/**
 * Hosted demo without a database: each server copy keeps its own throwaway data, so a
 * booking or sign-in made on one copy is missing on the next. Say so plainly.
 */
export async function NoDatabaseNotice({ what, className = "" }: { what: string; className?: string }) {
  if (!noSharedDatabase()) return null;
  const t = (await getT()).booking.noDatabase;
  return (
    <section role="status" className={`${className} rounded-xl bg-warn-soft p-4 text-[15px] text-warn`}>
      <h2 className="font-semibold">{t.title}</h2>
      <p className="mt-1">
        {what} {t.body}
      </p>
      <p className="mt-2">{t.fix}</p>
    </section>
  );
}
