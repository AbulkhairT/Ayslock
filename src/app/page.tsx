import Link from "next/link";
import { modes } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { LookupForm } from "./_home/LookupForm";
import { PhoneMockup } from "./_home/PhoneMockup";

const dark = "inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-base font-semibold text-white transition hover:bg-ink/85";

const WHO = [
  { t: "Barbers", d: "Cuts, fades and beard trims with buffers between chairs.", c: "from-amber-100 to-orange-200", e: "💈" },
  { t: "Massage therapists", d: "Longer sessions, breaks, and approval for new clients.", c: "from-emerald-100 to-teal-200", e: "💆" },
  { t: "Personal trainers", d: "Sessions at the gym, the park or online.", c: "from-sky-100 to-indigo-200", e: "🏋️" },
  { t: "Tutors", d: "Invite-only times for the families you work with.", c: "from-violet-100 to-fuchsia-200", e: "📚" },
  { t: "Consultants", d: "Online calls in every client's own timezone.", c: "from-rose-100 to-pink-200", e: "💼" },
];

const FEATURES = [
  { t: "Smart availability", d: "Set weekly hours with breaks, days off and special hours. Clients only see times that fit the whole service, with your buffer and notice respected." },
  { t: "Blocked time and breaks", d: "Block a lunch, an errand or a whole afternoon in two taps. Those times disappear from your booking page instantly." },
  { t: "No double bookings, ever", d: "Two people can't grab the same slot, even at the same second. If a time was just taken, the client is asked to pick another." },
  { t: "Automatic reminders", d: "Clients get a confirmation right away and a reminder 24 hours before. Cancel or move a booking and the reminder follows." },
  { t: "Client notes", d: "A simple client list with visit history and private notes only you can see." },
  { t: "Any timezone", d: "Clients see times in their own timezone, clearly labeled, with the full date in every summary." },
];

const MODES = [
  { t: "Open", d: "Anyone with your @username books instantly.", tag: "Instant" },
  { t: "Approval required", d: "Clients request a time. You approve or decline, and unanswered requests expire.", tag: "You decide" },
  { t: "Private", d: "Your times stay hidden. Clients ask for access and get a private link that you can switch off.", tag: "Invite only" },
];

const FAQ = [
  { q: "Do my clients need to download an app or make an account?", a: "No. They open your link or type your @username, pick a time, and enter their name and email. That's it." },
  { q: "Is it free?", a: "Basic booking is free: your profile, services, schedule, reminders and client list." },
  { q: "Can people search for me or browse providers?", a: "No. There's no public directory. Clients find you by your exact username or the link you share, so your page reaches the people you give it to." },
  { q: "What if I only want certain clients to book?", a: "Use Approval required to review every request, or Private so only people you approve can see your times." },
  { q: "Can clients cancel or reschedule?", a: "Yes. Every confirmation includes a private link to cancel, reschedule or add the appointment to their calendar. You're told right away." },
  { q: "Can I add bookings I take by phone?", a: "Yes. Add appointments by hand from your schedule. They follow the same no-overlap rule as online bookings." },
];

export default function Home() {
  const demo = modes.db === "pglite";
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1">
            <a href="#providers" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold text-muted hover:text-ink sm:inline-flex">For providers</a>
            <a href="#faq" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold text-muted hover:text-ink sm:inline-flex">FAQ</a>
            <Link href="/signin" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink">Sign in</Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85">Create profile</Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero: centered on username lookup */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent-soft via-white to-white" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.25fr_1fr] lg:pb-24 lg:pt-20">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-accent ring-1 ring-accent/20">Book without an app</p>
              <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
                Find your person.<br />Pick a time.<br /><span className="text-accent">You&apos;re booked.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted sm:text-xl">Book your barber, trainer, tutor or therapist with their Ayslock username. No app, no account.</p>
              <div className="mt-8 max-w-xl rounded-3xl bg-white p-4 shadow-xl ring-1 ring-line sm:p-5">
                <LookupForm />
                {demo && (
                  <p className="mt-3 text-sm text-muted">
                    Try a demo: {["marco", "lena", "sofia"].map((u, i) => (
                      <span key={u}>{i > 0 && " · "}<Link href={`/u/${u}`} className="font-semibold text-accent">@{u}</Link></span>
                    ))}
                  </p>
                )}
              </div>
              <div className="max-w-xl"><SavedProviders /></div>
            </div>
            <PhoneMockup />
          </div>
        </section>

        {/* Who it's for */}
        <section id="providers" aria-labelledby="who-title" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 id="who-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">Scheduling for independents</h2>
              <p className="mt-3 text-lg text-muted">One person, one @username, one simple booking page. Share it anywhere: “Here&apos;s my Ayslock: @you.”</p>
            </div>
            <Link href="/signup" className={dark}>Get started free</Link>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WHO.map((w) => (
              <li key={w.t} className={`flex min-h-40 flex-col justify-between sm:min-h-56 rounded-3xl bg-gradient-to-br ${w.c} p-5`}>
                <span aria-hidden className="text-4xl">{w.e}</span>
                <span>
                  <span className="block text-lg font-bold">{w.t}</span>
                  <span className="mt-1 block text-sm text-ink/70">{w.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-title" className="bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <h2 id="how-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">Ready in minutes</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { n: "1", t: "Create your profile", d: "Add your services, prices and weekly hours. We fill in Monday to Friday, 10 to 7, to start." },
                { n: "2", t: "Share your @username", d: "Copy your link or print your QR code. Put it in your bio, your chats or your shop window." },
                { n: "3", t: "Get booked", d: "Clients pick a time that works. You get the booking, they get a confirmation and a reminder." },
              ].map((s) => (
                <li key={s.n} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-lg font-bold text-white">{s.n}</span>
                  <h3 className="mt-5 text-xl font-bold">{s.t}</h3>
                  <p className="mt-2 text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="max-w-2xl">
            <h2 id="features-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">Powerful scheduling, kept simple</h2>
            <p className="mt-3 text-lg text-muted">Everything you need to run your day, and nothing your clients have to learn.</p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.t} className="rounded-3xl border border-line p-6">
                <h3 className="text-xl font-bold">{f.t}</h3>
                <p className="mt-2 text-muted">{f.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Access modes */}
        <section aria-labelledby="modes-title" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <h2 id="modes-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">You choose who books</h2>
              <p className="mt-3 text-lg text-white/70">Switch between three modes anytime in your settings.</p>
            </div>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {MODES.map((m) => (
                <li key={m.t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{m.tag}</span>
                  <h3 className="mt-5 text-2xl font-bold">{m.t}</h3>
                  <p className="mt-2 text-white/70">{m.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-5 py-16 lg:py-24">
          <h2 id="faq-title" className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">Questions, answered</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-2">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <span aria-hidden className="text-2xl text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-16">
          <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-accent to-fuchsia-600 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">What are you waiting for?</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">Create your Ayslock and share your @username today. Free for basic booking.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-ink hover:bg-white/90">Create your profile</Link>
              <a href="#username" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 font-semibold text-white ring-1 ring-white/50 hover:bg-white/10">Book with someone</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/signup" className="hover:text-ink">Create your profile</Link>
            <Link href="/signin" className="hover:text-ink">Provider sign in</Link>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <p>© {new Date().getFullYear()} Ayslock</p>
        </div>
      </footer>
    </div>
  );
}
