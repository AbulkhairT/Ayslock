"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { title: "Type their @username", body: "The name your barber, tutor or trainer gave you. No search, no directory." },
  { title: "Choose a service", body: "Length and price are shown up front." },
  { title: "Pick a time", body: "Only real free times, shown in your own timezone." },
  { title: "You're booked", body: "A confirmation by email, with a link to change or cancel." },
];

const INTERVAL = 3600;

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

/** What the screen looks like at each step: a faithful, simplified copy of the real booking pages. */
function Scene({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="ays-in">
        <p className="text-[22px] font-semibold tracking-tight">Book your next visit.</p>
        <p className="mt-4 text-sm text-muted">Enter your provider&apos;s @username.</p>
        <div className="mt-2 flex gap-2">
          <div className="flex h-12 flex-1 items-center rounded-xl border border-accent px-3 text-lg ring-2 ring-accent/20">
            <span className="text-muted">@</span>
            <span className="ays-type">marco</span>
            <span className="ml-px h-6 w-px animate-pulse bg-ink motion-reduce:hidden" />
          </div>
          <span className="ays-press grid h-12 place-items-center rounded-xl bg-accent px-4 font-semibold text-white">Find</span>
        </div>
      </div>
    );
  }
  if (step === 1) {
    const services = [
      ["Haircut", "30 min", "$35"],
      ["Beard trim", "20 min", "$20"],
      ["Cut and beard", "45 min", "$50"],
    ];
    return (
      <div className="ays-in">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft font-semibold text-accent">MB</span>
          <div>
            <p className="font-semibold">Marco Bellini</p>
            <p className="text-sm text-muted">@marco · Brooklyn, NY</p>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {services.map(([n, d, p], i) => (
            <li key={n} className={`flex items-center justify-between gap-3 px-2 py-3 ${i === 0 ? "ays-press rounded-lg bg-accent-soft" : ""}`}>
              <span className="font-medium">{n}</span>
              <span className="flex gap-4 text-sm tabular-nums text-muted">
                <span className="w-12 text-right">{d}</span>
                <span className="w-8 text-right text-ink">{p}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 2) {
    const days = [["Mon", "5"], ["Tue", "6"], ["Wed", "7"], ["Thu", "8"], ["Fri", "9"]];
    const times = ["9:30 AM", "10:15 AM", "11:15 AM", "1:00 PM", "2:45 PM", "4:30 PM"];
    return (
      <div className="ays-in">
        <p className="text-sm text-muted">Haircut · 30 min · $35</p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {days.map(([d, n], i) => (
            <span key={d} className={`flex flex-col items-center rounded-xl border py-1.5 ${i === 1 ? "border-accent bg-accent text-white" : "border-line"}`}>
              <span className="text-[11px] font-semibold uppercase">{d}</span>
              <span className="text-lg font-semibold">{n}</span>
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {times.map((t, i) => (
            <span key={t} className={`grid h-10 place-items-center rounded-xl border text-sm font-medium ${i === 2 ? "ays-press border-accent bg-accent text-white" : "border-line"}`}>{t}</span>
          ))}
        </div>
        <span className="mt-3 grid h-11 place-items-center rounded-xl bg-accent text-sm font-semibold text-white">Continue with Tue, Oct 6 at 11:15 AM</span>
      </div>
    );
  }
  return (
    <div className="ays-in">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-ok-soft text-ok">
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <p className="mt-3 text-[22px] font-semibold tracking-tight">You&apos;re booked</p>
      <dl className="mt-2 divide-y divide-line border-y border-line text-sm">
        <Row k="With" v="Marco Bellini" />
        <Row k="When" v="Tue, Oct 6 · 11:15 AM" />
        <Row k="Where" v="48 Orchard Lane, Brooklyn" />
      </dl>
      <p className="mt-3 text-sm text-muted">Add to calendar · Change or cancel</p>
    </div>
  );
}

/** A short, looping walkthrough of booking. Pauses on request and stays still when reduced motion is set. */
export function BookingDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Autoplay only when the person hasn't asked for reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the motion preference is only known in the browser
    setPlaying(!reduce);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), INTERVAL);
    return () => clearTimeout(t);
  }, [playing, step]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,360px)] md:items-start md:gap-12">
      <div>
        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => {
            const on = i === step;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => { setStep(i); setPlaying(false); }}
                  aria-current={on ? "step" : undefined}
                  className="flex w-full gap-4 py-4 text-left"
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums transition-colors ${on ? "bg-accent text-white" : "bg-canvas text-muted"}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className={`block font-semibold ${on ? "text-ink" : "text-muted"}`}>{s.title}</span>
                    <span className={`mt-0.5 block text-[15px] text-muted ${on ? "" : "hidden md:block"}`}>{s.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setPlaying((p) => !p)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">
          {playing ? (
            <><svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>Pause</>
          ) : (
            <><svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M2 1l9 5-9 5z" fill="currentColor" /></svg>Play walkthrough</>
          )}
        </button>
      </div>
      <figure aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].title}`} className="order-first rounded-2xl border border-line bg-surface p-5 sm:p-6 md:order-none">
        <div className="min-h-[290px]" aria-hidden>
          <Scene key={step} step={step} />
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </figure>
    </div>
  );
}
