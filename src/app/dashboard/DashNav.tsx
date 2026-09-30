"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Schedule" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-6 border-b border-line">
      {LINKS.map((l) => {
        const active = l.href === "/dashboard" ? path === "/dashboard" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px] ${active ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"} ${l.href.endsWith("settings") ? "ml-auto" : ""}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
