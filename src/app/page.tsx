import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { btnSecondary } from "@/components/ui";
import { LookupForm } from "./_home/LookupForm";

export default function Home() {
  return (
    <main id="main" className="mx-auto flex min-h-[calc(100dvh-40px)] max-w-xl flex-col px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/signin" className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
          Provider sign in
        </Link>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find your person.<br />Pick a time.<br /><span className="text-accent">You&apos;re booked.</span></h1>
        <p className="mt-4 max-w-md text-lg text-muted">Book your barber, trainer, tutor or therapist with their Ayslock username. No app, no account.</p>
        <div className="mt-10 w-full text-left">
          <LookupForm />
        </div>
        <SavedProviders />
      </div>
      <footer className="rounded-3xl border border-line bg-white p-5 text-center">
        <p className="font-semibold">Take bookings with your own @username.</p>
        <p className="mt-1 text-sm text-muted">Free for basic booking.</p>
        <Link href="/signup" className={`${btnSecondary} mt-4 w-full sm:w-auto`}>
          Create your profile
        </Link>
      </footer>
    </main>
  );
}
