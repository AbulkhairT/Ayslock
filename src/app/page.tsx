import Link from "next/link";
import { env, modes } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { BookingDemo } from "./_home/BookingDemo";
import { ClaimForm } from "./_home/ClaimForm";
import { LookupForm } from "./_home/LookupForm";

const host = env.appUrl.replace(/^https?:\/\//, "");

const MODES = [
  ["Open", "Anyone with your username sees your free times and books straight away."],
  ["Approve first", "People request a time. It's held for them until you accept, or it lapses."],
  ["Invite only", "Your times stay hidden. People ask, and you send a private link you can turn off."],
];

export default function Home() {
  const demo = modes.auth === "demo";
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center text-[15px]">
          <Link href="#providers" className="hidden min-h-11 items-center px-3 text-muted hover:text-ink sm:inline-flex">Offer your services</Link>
          <Link href="/signin" className="inline-flex min-h-11 items-center px-3 font-medium hover:text-accent">Log in</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto max-w-xl px-4 pb-14 pt-8 sm:px-6 sm:pt-20">
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-5xl">Book your next visit.</h1>
          <p className="mb-7 mt-3 text-lg text-muted">Your barber, tutor or trainer gives you their @username. That&apos;s all you need.</p>
          <LookupForm />
          {demo && (
            <p className="mt-4 text-[15px] text-muted">
              Just looking? Try <Link className="font-medium text-accent hover:underline" href="/u/marco">@marco</Link>,{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/lena">@lena</Link> or{" "}
              <Link className="font-medium text-accent hover:underline" href="/u/sofia">@sofia</Link>.
            </p>
          )}
          <SavedProviders />
          <p className="mt-8 text-[15px] text-muted sm:hidden">
            Take bookings yourself? <Link href="#providers" className="font-medium text-accent">Offer your services</Link>
          </p>
        </section>

        <section aria-labelledby="how-title" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="how-title" className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">How booking works</h2>
            <BookingDemo />
          </div>
        </section>

        <section id="providers" aria-labelledby="providers-title" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:gap-16">
            <div>
              <h2 id="providers-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Offer your services</h2>
              <p className="mb-7 mt-3 text-lg text-muted">
                Set your services and hours once. Share one link. Clients only ever see times that genuinely fit.
              </p>
              <ClaimForm host={host} />
              <p className="mt-4 text-[15px] text-muted">
                Already set up? <Link href="/signin" className="font-medium text-accent hover:underline">Log in</Link>
              </p>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">You choose who can book</h3>
              <dl className="mt-3 divide-y divide-line border-y border-line">
                {MODES.map(([t, d]) => (
                  <div key={t} className="py-4">
                    <dt className="font-semibold">{t}</dt>
                    <dd className="mt-1 text-[15px] text-muted">{d}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[15px] text-muted">Two people can never end up with the same slot.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo />
          <div className="flex">
            <Link href="/signup" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Create a page</Link>
            <Link href="/signin" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
