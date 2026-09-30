import Link from "next/link";
import { env, modes } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { SavedProviders } from "@/components/SavedProviders";
import { ClaimForm } from "./_home/ClaimForm";
import { LookupForm } from "./_home/LookupForm";

const host = env.appUrl.replace(/^https?:\/\//, "");

/** A small, true-to-life preview of a provider's page. */
function ProfilePreview() {
  const services = [
    ["Haircut", "30 min", "$35"],
    ["Beard trim", "20 min", "$20"],
    ["Cut and beard", "45 min", "$50"],
  ];
  const times = ["10:30", "11:15", "13:00", "14:45", "16:30"];
  return (
    <div aria-hidden className="mx-auto w-full max-w-[340px] rounded-[36px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_60px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#efe8da] text-lg font-semibold">MB</div>
        <p className="mt-3 text-lg font-semibold">Marco Bellini</p>
        <p className="text-sm text-muted">@marco · Barber in Brooklyn</p>
      </div>
      <ul className="mt-5 space-y-2">
        {services.map(([n, d, p], i) => (
          <li key={n} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${i === 0 ? "bg-ink text-white" : "bg-canvas"}`}>
            <span className="font-medium">{n}</span>
            <span className={i === 0 ? "text-white/70" : "text-muted"}>{d} · {p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs font-medium text-muted">Tomorrow</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {times.map((t, i) => (
          <span key={t} className={`rounded-full px-3 py-1.5 text-sm ${i === 1 ? "bg-ink text-white" : "border border-line"}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const demo = modes.auth === "demo";
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 text-[15px]">
          <Link href="/signin" className="rounded-full px-4 py-2 font-medium hover:bg-black/5">Log in</Link>
          <Link href="/signup" className="rounded-full bg-ink px-4 py-2 font-semibold text-white hover:bg-ink/85">Create</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto max-w-2xl px-5 pb-16 pt-14 text-center sm:pt-24">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-7xl">One link for every booking.</h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted">
            Share your @username. Clients pick a time and they&apos;re booked. No app, no account, no back-and-forth.
          </p>
          <div className="mx-auto mt-9 max-w-md text-left">
            <ClaimForm host={host} />
          </div>
          {demo && (
            <Link href="/u/marco" className="mt-2 inline-block text-[15px] font-medium text-accent hover:underline">
              See it working on @marco →
            </Link>
          )}
        </section>

        <section className="px-5 pb-20">
          <ProfilePreview />
        </section>

        <section className="mx-auto max-w-md px-5 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight">Booking with someone?</h2>
          <p className="mb-5 mt-1 text-muted">No sign-up needed. Just their username.</p>
          <LookupForm />
          {demo && (
            <p className="mt-4 pl-5 text-sm text-muted">
              Try <Link className="font-medium text-ink underline" href="/u/marco">@marco</Link>, <Link className="font-medium text-ink underline" href="/u/lena">@lena</Link> or{" "}
              <Link className="font-medium text-ink underline" href="/u/sofia">@sofia</Link>.
            </p>
          )}
          <div className="mt-6">
            <SavedProviders />
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-20 sm:grid-cols-3">
            {[
              ["1", "Claim your @username", "Pick the name clients will type. You can change it later."],
              ["2", "Add services and hours", "What you offer, how long it takes, when you work. Ayslock only offers times that fit."],
              ["3", "Share the link", "In your bio, your messages, or as a QR code by the mirror."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="text-sm font-semibold text-accent">{n}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{t}</h3>
                <p className="mt-2 text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">You decide who gets in.</h2>
            <dl className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                ["Open", "Anyone with your username sees your free times and books."],
                ["Approve first", "Clients request a time. It's held for them until you say yes, or it lapses."],
                ["Invite only", "Your times stay hidden. People ask, and you send a private link you can switch off."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-3xl bg-white p-6">
                  <dt className="text-lg font-semibold">{t}</dt>
                  <dd className="mt-2 text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-md px-5 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get your link.</h2>
            <p className="mb-8 mt-2 text-muted">Free for your page, services, hours, reminders and client list.</p>
            <div className="text-left">
              <ClaimForm host={host} id="claim-bottom" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
          <Logo />
          <div className="flex gap-5">
            <Link href="/signup" className="hover:text-ink">Create a page</Link>
            <Link href="/signin" className="hover:text-ink">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
