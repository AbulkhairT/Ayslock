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
    <nav aria-label="Dashboard" className="mt-4 flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-line">
      {LINKS.map((l) => {
        const active = l.href === "/dashboard" ? path === "/dashboard" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
