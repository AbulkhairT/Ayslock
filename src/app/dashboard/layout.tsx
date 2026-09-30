import Link from "next/link";
import { requireProvider } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { signOutAction } from "../(auth)/actions";
import { DashNav } from "./DashNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const provider = await requireProvider();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between gap-2 py-2">
        <Logo />
        <div className="flex min-w-0 items-center text-[15px]">
          <Link href={`/u/${provider.username}`} className="inline-flex min-h-11 min-w-0 items-center px-2 text-accent hover:underline sm:px-3" target="_blank">
            <span className="truncate">@{provider.username}</span>
            <span className="sr-only"> (your booking page, opens in a new tab)</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="inline-flex min-h-11 items-center px-2 text-muted hover:text-ink sm:px-3">Log out</button>
          </form>
        </div>
      </header>
      <DashNav />
      <main id="main" className="mt-6">{children}</main>
    </div>
  );
}
