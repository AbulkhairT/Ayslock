import Link from "next/link";
import { demoStorage } from "@/lib/demo-storage";
import { modes } from "@/lib/env";

/** Always-visible label for anything simulated, so demo behavior is never mistaken for production. */
export function DemoBanner() {
  const parts: string[] = [];
  if (modes.auth === "demo") parts.push("sign-in is simulated");
  if (modes.email === "preview") parts.push("emails are previewed, not sent");
  if (modes.db === "pglite") {
    parts.push(demoStorage().ephemeral ? "no database is connected, so bookings and sign-ins may not stick (add DATABASE_URL, see the README)" : "data lives in a local database file");
  }
  if (!parts.length) return null;
  return (
    <div className="bg-warn-soft px-4 py-2 text-center text-[13px] text-warn">
      <strong className="font-semibold">Demo mode:</strong> {parts.join(", ")}.{" "}
      {modes.email === "preview" && (
        <Link href="/demo/outbox" className="font-semibold underline underline-offset-2">
          Notification preview
        </Link>
      )}
    </div>
  );
}
