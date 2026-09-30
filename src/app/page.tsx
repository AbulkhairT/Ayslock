import Link from "next/link";
import { modes } from "@/lib/env";
import { SavedProviders } from "@/components/SavedProviders";
import { serif } from "./_home/fonts";
import { LookupForm } from "./_home/LookupForm";

// Landing palette: warm paper, ink, and the brand violet used sparingly.
const PAPER = "bg-[#f3eee4]";
const INK = "text-[#1a1714]";
const MUTED = "text-[#5b554c]";
const S = "font-[family-name:var(--font-serif)] font-normal";

function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 240 16" preserveAspectRatio="none" className={className}>
      <path d="M3 10 C 38 3, 72 14, 110 8 S 180 3, 237 9" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 30" className={className}>
      <path d="M58 6 C 40 2, 22 8, 8 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 22 L 9 13 M8 22 L 17 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The paper appointment card barbers hand out, which Ayslock replaces. */
function AppointmentCard() {
  const row = (k: string, v: string) => (
    <div className="flex items-end gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b554c]">{k}</span>
      <span className="mb-1.5 flex-1 border-b border-dotted border-[#1a1714]/40" />
      <span className={`${S} text-[28px] italic leading-none text-[#2b2fa8]`}>{v}</span>
    </div>
  );
  return (
    <figure className="relative mx-auto w-full max-w-[380px]">
      <div className="relative -rotate-[3deg] bg-[#fffdf8] px-7 pb-16 pt-9 shadow-[0_1px_0_#d9d1c3,0_18px_30px_-18px_rgba(26,23,20,0.45)] ring-1 ring-[#e3dccf]">
        <span aria-hidden className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-[4deg] bg-[#e9dcbc]/80" />
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5b554c]">Bellini Barbers</p>
        <p className={`${S} mt-1 text-center text-3xl`}>Your next appointment</p>
        <div className="mt-6 space-y-4">
          {row("Name", "Priya")}
          {row("Day", "Tues 7th")}
          {row("Time", "10:30")}
          {row("For", "cut + beard")}
        </div>
        <div aria-hidden className="absolute -bottom-9 right-2 grid sm:-right-5 h-24 w-24 rotate-[14deg] bg-[#fffdf8]/70 place-items-center rounded-full border-2 border-[#4f3bd9] text-center text-[10px] font-bold uppercase leading-tight tracking-widest text-[#4f3bd9] opacity-90">
          Booked<br />via<br />@marco
        </div>
      </div>
      <figcaption className={`mt-16 text-center text-sm ${MUTED}`}>The little card from the front desk, now a link anyone can open.</figcaption>
    </figure>
  );
}

type Kind = "booked" | "buffer" | "open" | "break" | "pending" | "blocked";
const DAY: { t: string; kind: Kind; label: string; note?: string }[] = [
  { t: "10:00", kind: "booked", label: "Haircut · Priya S.", note: "booked from the link in his bio, at 11 at night" },
  { t: "10:30", kind: "buffer", label: "5 min buffer", note: "time to sweep up. Clients never see it" },
  { t: "10:35", kind: "booked", label: "Cut and beard · Tom B." },
  { t: "11:20", kind: "open", label: "Open", note: "only times that fit a whole service are offered" },
  { t: "14:00", kind: "break", label: "Lunch" },
  { t: "15:00", kind: "pending", label: "Beard trim · request from Ana R.", note: "held for him until he says yes, or it lapses" },
  { t: "16:30", kind: "blocked", label: "School pickup", note: "blocked in two taps. Nobody can book over it" },
  { t: "17:00", kind: "open", label: "Open" },
];

const BLOCK: Record<Kind, string> = {
  booked: "bg-[#1a1714] text-[#f3eee4]",
  buffer: "bg-[repeating-linear-gradient(135deg,#d9d1c3_0_2px,transparent_2px_8px)] text-[#5b554c]",
  open: "border border-[#d9d1c3] text-[#5b554c]",
  break: "border border-dotted border-[#1a1714]/40 text-[#5b554c] italic",
  pending: "border-2 border-dashed border-[#4f3bd9] text-[#2b2fa8]",
  blocked: "bg-[repeating-linear-gradient(135deg,#1a1714_0_2px,#f3eee4_2px_7px)] text-[#1a1714]",
};

const SIGNS = [
  { title: "Open", sub: "Book right away", body: "Anyone with your @username sees your free times and books on the spot.", cls: "bg-[#1a1714] text-[#f3eee4]", rot: "-rotate-2" },
  { title: "By appointment", sub: "Ask, then I confirm", body: "Clients request a time. It's held for them while you decide, and lapses if you don't.", cls: "bg-[#fffdf8] text-[#1a1714] ring-2 ring-[#1a1714]", rot: "rotate-[1.5deg]" },
  { title: "By invitation", sub: "Regulars only", body: "Your times stay hidden. People ask first, and you send a private link you can switch off.", cls: "bg-[#4f3bd9] text-white", rot: "-rotate-1" },
];

const SMALL_PRINT = [
  ["Do clients need the app?", "No. It's a web page. They type your username or tap your link, pick a time, and leave a name and email."],
  ["Is it free?", "Basic booking is: your page, services, hours, reminders and client list."],
  ["Can strangers find me?", "Only if they know your exact username. There's no directory and no search, on purpose."],
  ["What if someone grabs the same slot?", "Only one of them gets it. The other is told right away and shown what's still free."],
  ["Can they cancel or move it?", "Yes, from the link in their confirmation. You're told, and the reminder moves with it."],
  ["Walk-ins and phone bookings?", "Add them to your day by hand. They follow the same no-overlap rule."],
];

export default function Home() {
  const demo = modes.auth === "demo";
  return (
    <div className={`${serif.variable} ${PAPER} ${INK} min-h-dvh overflow-x-clip`}>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className={`${S} text-3xl tracking-tight`} aria-label="Ayslock home">
          <span className="text-[#4f3bd9]">@</span>ayslock
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-[15px]">
          <a href="#for-providers" className="hidden min-h-11 items-center px-3 font-medium sm:inline-flex">For providers</a>
          <Link href="/signin" className="inline-flex min-h-11 items-center px-3 font-medium">Sign in</Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-[10px] border-2 border-[#1a1714] px-4 font-semibold hover:bg-[#1a1714] hover:text-[#f3eee4]">
            <span className="sm:hidden">Sign up</span>
            <span className="hidden sm:inline">Make your page</span>
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl gap-16 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:pb-28 lg:pt-16">
          <div>
            <h1 className={`${S} text-[3.4rem] leading-[0.95] tracking-[-0.02em] sm:text-[5.2rem] lg:text-[6rem]`}>
              Find your person.
              <br />
              Pick a time.
              <br />
              <span className="relative inline-block italic">
                You&apos;re booked.
                <Squiggle className="absolute -bottom-2 left-0 h-4 w-full text-[#4f3bd9]" />
              </span>
            </h1>
            <p className={`mt-8 max-w-md text-lg leading-relaxed ${MUTED}`}>
              Your barber, trainer or tutor gives you their username. You pick a time. No app to download, no account to make.
            </p>
            <div className="mt-10 max-w-lg">
              <LookupForm />
              {demo && (
                <p className={`mt-4 text-sm ${MUTED}`}>
                  Just looking? Try{" "}
                  {["marco", "lena", "sofia"].map((u, i) => (
                    <span key={u}>
                      {i > 0 && (i === 2 ? " or " : ", ")}
                      <Link href={`/u/${u}`} className="font-semibold text-[#1a1714] underline decoration-[#4f3bd9] decoration-2 underline-offset-4">@{u}</Link>
                    </span>
                  ))}
                  .
                </p>
              )}
              <SavedProviders />
            </div>
          </div>
          <AppointmentCard />
        </section>

        <section id="for-providers" aria-labelledby="day-title" className="border-y border-[#d9d1c3] bg-[#ebe4d6]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#5b554c]">For providers</p>
            <h2 id="day-title" className={`${S} mt-3 max-w-3xl text-5xl leading-[1.02] sm:text-6xl`}>
              Marco&apos;s Tuesday, <span className="italic">sorted before he opens the door.</span>
            </h2>
            <p className={`mt-5 max-w-xl text-lg ${MUTED}`}>
              You set your hours, breaks and a buffer once. Ayslock only ever offers the gaps that genuinely fit.
            </p>

            <ol className="mt-12 max-w-4xl">
              {DAY.map((d) => (
                <li key={d.t + d.label} className="grid grid-cols-[4rem_1fr] items-start gap-x-4 border-t border-[#d9d1c3] py-2.5 sm:grid-cols-[5rem_minmax(0,22rem)_1fr] sm:gap-x-6">
                  <span className={`${S} pt-1.5 text-xl tabular-nums`}>{d.t}</span>
                  <span className={`block rounded-[6px] px-3 py-2.5 text-[15px] font-medium ${BLOCK[d.kind]}`}>
                    {d.kind === "blocked" ? <span className="bg-[#f3eee4] px-1.5 py-0.5">{d.label}</span> : d.label}
                    {d.kind === "pending" && <span className="ml-2 text-[11px] font-bold uppercase tracking-widest">pending</span>}
                  </span>
                  {d.note ? (
                    <span className={`${S} col-start-2 flex items-start gap-2 pt-1 text-lg italic leading-snug text-[#2b2fa8] sm:col-start-3 sm:pt-1.5`}>
                      <Arrow className="mt-0.5 hidden h-5 w-10 shrink-0 sm:block" />
                      {d.note}
                    </span>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </li>
              ))}
            </ol>
            <p className={`mt-8 max-w-xl text-[15px] ${MUTED}`}>
              Clients get a confirmation straight away and a reminder the day before. If two people go for 10:35 at the same second, only one of them gets it.
            </p>
          </div>
        </section>

        <section aria-labelledby="signs-title" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 id="signs-title" className={`${S} max-w-2xl text-5xl leading-[1.02] sm:text-6xl`}>
            Hang whichever sign <span className="italic">suits you.</span>
          </h2>
          <p className={`mt-5 max-w-xl text-lg ${MUTED}`}>Switch any time in your settings. Most people start open.</p>
          <ul className="mt-14 grid gap-14 md:grid-cols-3 md:gap-8">
            {SIGNS.map((s) => (
              <li key={s.title} className="flex flex-col items-center text-center">
                <div className={`relative ${s.rot}`}>
                  <svg aria-hidden viewBox="0 0 120 40" className="mx-auto -mb-1 h-10 w-32 text-[#1a1714]">
                    <circle cx="60" cy="4" r="3.5" fill="currentColor" />
                    <path d="M60 4 L 14 38 M60 4 L 106 38" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  </svg>
                  <div className={`w-64 rounded-[6px] px-6 py-6 ${s.cls}`}>
                    <p className={`${S} text-4xl uppercase tracking-wide`}>{s.title}</p>
                    <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.2em] opacity-80">{s.sub}</p>
                  </div>
                </div>
                <p className={`mt-6 max-w-[17rem] text-[15px] leading-relaxed ${MUTED}`}>{s.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="who-title" className="bg-[#1a1714] text-[#f3eee4]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 id="who-title" className="sr-only">Who it&apos;s for</h2>
            <p className={`${S} max-w-5xl text-4xl leading-[1.12] sm:text-6xl`}>
              Made for <span className="italic text-[#c9c2ff]">barbers</span>, massage therapists,{" "}
              <span className="italic text-[#c9c2ff]">personal trainers</span>, tutors, consultants, and anyone whose calendar currently lives in their{" "}
              <span className="relative inline-block italic">
                DMs.
                <Squiggle className="absolute -bottom-1 left-0 h-3 w-full text-[#c9c2ff]" />
              </span>
            </p>
            <div className="mt-14 grid gap-10 text-[15px] leading-relaxed text-[#f3eee4]/75 sm:grid-cols-3">
              <p><span className={`${S} mr-2 text-3xl text-[#f3eee4]`}>1.</span>Pick a username and add what you offer, how long it takes, and what it costs if you like.</p>
              <p><span className={`${S} mr-2 text-3xl text-[#f3eee4]`}>2.</span>Set your week. We start you on Monday to Friday, ten till seven, and you change what&apos;s wrong.</p>
              <p><span className={`${S} mr-2 text-3xl text-[#f3eee4]`}>3.</span>Share it. &ldquo;Here&apos;s my Ayslock: @you.&rdquo; Print the QR code for the mirror if you want.</p>
            </div>
            <Link href="/signup" className="mt-12 inline-flex min-h-12 items-center rounded-[10px] bg-[#f3eee4] px-6 font-semibold text-[#1a1714] hover:bg-white">
              Make your page, free
            </Link>
          </div>
        </section>

        <section aria-labelledby="print-title" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 id="print-title" className={`${S} text-5xl sm:text-6xl`}>
            The small print, <span className="italic">in plain words.</span>
          </h2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {SMALL_PRINT.map(([q, a]) => (
              <div key={q} className="border-t-2 border-[#1a1714] pt-4">
                <dt className="text-lg font-semibold">{q}</dt>
                <dd className={`mt-2 text-[15px] leading-relaxed ${MUTED}`}>{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-[#d9d1c3]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <p className={`${S} text-[2.6rem] leading-tight sm:text-7xl`}>
              &ldquo;Here&apos;s my Ayslock:{" "}
              <Link href="/signup" className="group inline-flex items-baseline whitespace-nowrap">
                <span className="text-[#4f3bd9]">@</span>
                <span className="inline-block w-[4.5ch] border-b-[3px] border-[#1a1714] group-hover:border-[#4f3bd9]" aria-hidden>&nbsp;</span>
                <span className="sr-only">claim your username</span>
              </Link>
              .&rdquo;
            </p>
            <Link href="/signup" className="mt-6 inline-flex min-h-11 items-center gap-2 text-lg font-semibold underline decoration-[#4f3bd9] decoration-2 underline-offset-[6px]">
              Claim your username
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d9d1c3]">
        <div className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm sm:px-8 ${MUTED}`}>
          <span className={`${S} text-2xl text-[#1a1714]`}><span className="text-[#4f3bd9]">@</span>ayslock</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/signup" className="hover:text-[#1a1714]">Make your page</Link>
            <Link href="/signin" className="hover:text-[#1a1714]">Provider sign in</Link>
          </nav>
          <span>Find your person. Pick a time. You&apos;re booked.</span>
        </div>
      </footer>
    </div>
  );
}
