import Link from "next/link";
import { Logo } from "@/components/Logo";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-tight">We couldn&apos;t find that page.</h1>
      <p className="mt-2 text-muted">If you were looking for a provider, check the exact username with them. Ayslock doesn&apos;t list providers publicly.</p>
      <Link href="/" className={`${btn} mt-6`}>
        Look up a username
      </Link>
    </main>
  );
}
