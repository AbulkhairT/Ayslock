import Link from "next/link";
import { demoStorage } from "@/lib/demo-storage";
import { configProblems, modes } from "@/lib/env";
import { getT } from "@/i18n/server";

/**
 * Shown only while sign-in is simulated or there's no real database, so demo behavior is
 * never mistaken for production. Missing email setup on a real site is explained where
 * it matters (the booking pages) instead of in a site-wide bar.
 */
export async function DemoBanner() {
  if (configProblems.length || (modes.auth !== "demo" && modes.db !== "pglite")) return null;
  const t = (await getT()).common.demo;
  const parts: string[] = [];
  if (modes.auth === "demo") parts.push(t.simulatedSignIn);
  if (modes.auth === "demo" && modes.email === "preview") parts.push(t.previewedEmail);
  if (modes.db === "pglite") {
    parts.push(demoStorage().ephemeral ? t.ephemeral : t.localFile);
  }
  return (
    <div className="bg-warn-soft px-4 py-2 text-center text-[13px] text-warn">
      <strong className="font-semibold">{t.label}</strong> {parts.join(", ")}.{" "}
      {modes.auth === "demo" && modes.email === "preview" && (
        <Link href="/demo/outbox" className="font-semibold underline underline-offset-2">
          {t.outbox}
        </Link>
      )}
    </div>
  );
}
