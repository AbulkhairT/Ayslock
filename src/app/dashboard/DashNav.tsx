"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

const LINKS = [
  { href: "/dashboard", key: "schedule" },
  { href: "/dashboard/clients", key: "clients" },
  { href: "/dashboard/settings", key: "settings" },
] as const;

export function DashNav({ newCount = 0 }: { newCount?: number }) {
  const path = usePathname();
  const d = useT().dashboard;
  const t = d.nav;
  return (
    <nav aria-label={t.label} className="flex gap-x-5 border-b border-line sm:gap-x-6">
      {LINKS.map((l) => {
        const active = l.href === "/dashboard" ? path === "/dashboard" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px] ${active ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"} ${l.href.endsWith("settings") ? "ml-auto" : ""}`}
          >
            {t[l.key]}
            {l.key === "schedule" && newCount > 0 && (
              <span className="ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold leading-5 text-white" aria-label={d.newBookings.badge(newCount)}>
                {newCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
