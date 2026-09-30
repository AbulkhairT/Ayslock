"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const t = useT();
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center font-semibold tracking-tight ${size === "lg" ? "text-3xl" : "text-xl"}`} aria-label={t.common.logoLabel}>
      <span aria-hidden className="text-accent">@</span>
      <span aria-hidden>ayslock</span>
    </Link>
  );
}
