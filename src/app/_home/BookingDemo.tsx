"use client";

import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { fmtDuration, fmtPrice, luxonFormats } from "@/lib/format";

const STEP_COUNT = 4;
// A fixed sample week (Mon Oct 5 to Fri Oct 9, 2026), so server and browser draw the same thing.
const sampleDay = (i: number, hour = 0, minute = 0) => DateTime.fromObject({ year: 2026, month: 10, day: 5 + i, hour, minute });

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
  const t = useT();
  const locale = useLocale();
  const d = t.home.demo;
  const f = luxonFormats(locale);
  const subtitle = `@marco · ${d.profession}`;
  const picked = sampleDay(1, 11, 15).setLocale(f.luxon);
  if (step === 0) {
    return (
      <div className="ays-in">
        <p className="text-[22px] font-semibold tracking-tight">{t.home.heading}</p>
        <div className="mt-4 flex h-12 items-center gap-2 rounded-xl border border-accent px-3 text-lg ring-2 ring-accent/20">
          <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-muted"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          {/* Each letter is always in the layout and just fades in, so no browser can clip it. */}
          <span>
            {"marco".split("").map((ch, i) => (
              <span key={i} className="ays-letter" style={{ animationDelay: `${250 + i * 160}ms` }}>{ch}</span>
            ))}
          </span>
          <span className="-ml-1.5 h-6 w-px animate-pulse bg-ink motion-reduce:hidden" />
        </div>
        <div className="ays-letter mt-3 flex items-center gap-3 border-y border-line py-3" style={{ animationDelay: "1300ms" }}>
          <span className="ays-press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-sm font-semibold" style={{ animationDelay: "1900ms" }}>MB</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Marco Bellini</span>
            <span className="block text-sm text-muted">{subtitle}</span>
          </span>
          <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2 shrink-0 text-muted"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
    );
  }
  if (step === 1) {
    const services = [
      [d.services[0], fmtDuration(30, locale), fmtPrice(3500, "USD", locale)],
      [d.services[1], fmtDuration(20, locale), fmtPrice(2000, "USD", locale)],
      [d.services[2], fmtDuration(45, locale), fmtPrice(5000, "USD", locale)],
    ];
    return (
      <div className="ays-in">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft font-semibold text-accent">MB</span>
          <div>
            <p className="font-semibold">Marco Bellini</p>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {services.map(([n, dur, p], i) => (
            <li key={n} className={`flex items-center justify-between gap-3 px-2 py-3 ${i === 0 ? "ays-press rounded-lg bg-accent-soft" : ""}`}>
              <span className="font-medium">{n}</span>
              <span className="flex gap-4 text-sm tabular-nums text-muted">
                <span className="min-w-12 text-right">{dur}</span>
                <span className="min-w-8 text-right text-ink">{p}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 2) {
    const days = [0, 1, 2, 3, 4].map((i) => {
      const day = sampleDay(i).setLocale(f.luxon);
      return [day.toFormat(f.dayName), day.toFormat(f.dayNum)];
    });
    const times = [[9, 30], [10, 15], [11, 15], [13, 0], [14, 45], [16, 30]].map(([h, m]) => sampleDay(1, h, m).setLocale(f.luxon).toFormat(f.time));
    return (
      <div className="ays-in">
        <p className="text-sm text-muted">{d.services[0]} · {fmtDuration(30, locale)} · {fmtPrice(3500, "USD", locale)}</p>
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
        <span className="mt-3 grid min-h-11 place-items-center rounded-xl bg-accent px-3 py-2 text-center text-sm font-semibold text-white">{t.booking.flow.continueWith(picked.toFormat(f.dateAtTime))}</span>
      </div>
    );
  }
  return (
    <div className="ays-in">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-ok-soft text-ok">
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <p className="mt-3 text-[22px] font-semibold tracking-tight">{d.booked}</p>
      <dl className="mt-2 divide-y divide-line border-y border-line text-sm">
        <Row k={d.with} v="Marco Bellini" />
        <Row k={d.when} v={`${picked.toFormat(f.shortDate)} · ${picked.toFormat(f.time)}`} />
        <Row k={d.where} v={d.address} />
      </dl>
      <p className="mt-3 text-sm text-muted">{d.footer}</p>
    </div>
  );
}

/** A short, looping walkthrough of booking. Pauses on request and stays still when reduced motion is set. */
export function BookingDemo() {
  const t = useT();
  const STEPS = t.home.demo.steps;
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
    const t = setTimeout(() => setStep((s) => (s + 1) % STEP_COUNT), INTERVAL);
    return () => clearTimeout(t);
  }, [playing, step]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,360px)] md:items-start md:gap-12">
      <div>
        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => {
            const on = i === step;
            return (
              <li key={i}>
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
            <><svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>{t.home.demo.pause}</>
          ) : (
            <><svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M2 1l9 5-9 5z" fill="currentColor" /></svg>{t.home.demo.play}</>
          )}
        </button>
      </div>
      <figure aria-label={t.home.demo.figure(step + 1, STEPS.length, STEPS[step].title)} className="order-first rounded-2xl border border-line bg-surface p-5 sm:p-6 md:order-none">
        <div className="min-h-[290px]" aria-hidden>
          <Scene key={step} step={step} />
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </figure>
    </div>
  );
}
