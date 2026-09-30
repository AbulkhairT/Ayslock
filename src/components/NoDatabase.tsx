import { demoStorage } from "@/lib/demo-storage";
import { modes } from "@/lib/env";

/** True when the app runs on a host that can't keep a local database between requests. */
export function noSharedDatabase() {
  return modes.db === "pglite" && demoStorage().ephemeral;
}

/**
 * Hosted demo without a database: each server copy keeps its own throwaway data, so a
 * booking or sign-in made on one copy is missing on the next. Say so plainly.
 */
export function NoDatabaseNotice({ what, className = "" }: { what: string; className?: string }) {
  if (!noSharedDatabase()) return null;
  return (
    <section role="status" className={`${className} rounded-2xl border border-warn/40 bg-warn-soft p-5 text-sm text-warn`}>
      <h2 className="font-bold">This site isn&apos;t connected to a database yet</h2>
      <p className="mt-1">
        {what} Each server copy keeps its own temporary data until a database is added, so the next page can land on a
        copy that has never seen it.
      </p>
      <p className="mt-2">
        To fix it on Vercel: Storage, then Create Database, choose Neon, connect it to this project and redeploy. Tables
        and demo accounts are set up automatically.
      </p>
    </section>
  );
}
