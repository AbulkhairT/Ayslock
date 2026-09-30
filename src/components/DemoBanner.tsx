import Link from "next/link";
import { demoStorage } from "@/lib/demo-storage";
import { modes } from "@/lib/env";

/**
 * Shown only while sign-in is simulated or there's no real database, so demo behavior is
 * never mistaken for production. Missing email setup on a real site is explained where
 * it matters (the booking pages) instead of in a site-wide bar.
 */
export function DemoBanner() {
  if (modes.auth !== "demo" && modes.db !== "pglite") return null;
  const parts: string[] = [];
  if (modes.auth === "demo") parts.push("sign-in is simulated");
  if (modes.auth === "demo" && modes.email === "preview") parts.push("emails are previewed, not sent");
  if (modes.db === "pglite") {
    parts.push(demoStorage().ephemeral ? "no database is connected, so bookings and sign-ins may not stick" : "data lives in a local database file");
  }
  return (
    <div className="bg-warn-soft px-4 py-2 text-center text-[13px] text-warn">
      <strong className="font-semibold">Demo mode:</strong> {parts.join(", ")}.{" "}
      {modes.auth === "demo" && modes.email === "preview" && (
        <Link href="/demo/outbox" className="font-semibold underline underline-offset-2">
          Notification preview
        </Link>
      )}
    </div>
  );
}
