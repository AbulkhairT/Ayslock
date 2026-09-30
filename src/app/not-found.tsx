import Link from "next/link";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { btn } from "@/components/ui";

export default async function NotFound() {
  const t = (await getT()).booking.notFound;
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="flex items-center gap-2">
        <Logo />
        <LanguageSwitch />
      </div>
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-2 text-muted">{t.body}</p>
      <Link href="/" className={`${btn} mt-6`}>
        {t.lookup}
      </Link>
    </main>
  );
}
