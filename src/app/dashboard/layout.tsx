import Link from "next/link";
import { requireProvider } from "@/lib/session";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { signOutAction } from "../(auth)/actions";
import { DashNav } from "./DashNav";
import { ShareBar } from "./ShareBar";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { newBookings } from "@/lib/providers";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const provider = await requireProvider();
  const t = await getT();
  const fresh = (await newBookings(await getDb(), provider)).length;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between gap-2 py-2">
        <Logo />
        <div className="flex min-w-0 items-center text-[15px]">
          <Link href={`/u/${provider.username}`} className="inline-flex min-h-11 min-w-0 items-center px-2 text-accent hover:underline sm:px-3" target="_blank">
            <span className="truncate">@{provider.username}</span>
            <span className="sr-only">{t.dashboard.layout.bookingPageSr}</span>
          </Link>
          <LanguageSwitch />
          <form action={signOutAction}>
            <button type="submit" className="inline-flex min-h-11 items-center whitespace-nowrap px-2 text-muted hover:text-ink sm:px-3">{t.common.logOut}</button>
          </form>
        </div>
      </header>
      <ShareBar link={`${env.appUrl}/@${provider.username}`} username={provider.username} name={provider.display_name} />
      <DashNav newCount={fresh} />
      <main id="main" className="mt-6">{children}</main>
    </div>
  );
}
