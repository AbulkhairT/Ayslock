import Link from "next/link";
import { requireProvider } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { signOutAction } from "../(auth)/actions";
import { DashNav } from "./DashNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const provider = await requireProvider();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-1">
          <Link href={`/u/${provider.username}`} className="min-h-11 rounded-full px-3 py-2.5 text-sm font-semibold text-accent" target="_blank">
            @{provider.username} ↗
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <DashNav />
      <main id="main" className="mt-6">{children}</main>
    </div>
  );
}
