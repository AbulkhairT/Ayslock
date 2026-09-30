"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SlotPicker } from "@/components/SlotPicker";
import { browserZone } from "@/components/TimezoneSelect";
import { btn, hint, input, label, textarea } from "@/components/ui";
import { useLocale, useT } from "@/i18n/client";
import { luxonFormats } from "@/lib/format";

export interface ServiceView {
  id: string;
  name: string;
  description: string;
  duration: number;
  durationLabel: string;
  price: string | null;
}

interface Props {
  username: string;
  displayName: string;
  providerZone: string;
  location: string;
  mode: "open" | "approval" | "private";
  pendingHours: number;
  horizonDays: number;
  services: ServiceView[];
  accessToken?: string | null;
  emailOn?: boolean;
}

type Step = "service" | "time" | "details";

export function BookingFlow(p: Props) {
  const router = useRouter();
  const dict = useT();
  const t = dict.booking.flow;
  const fmt = dict.booking.fmt;
  const f = luxonFormats(useLocale());
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<ServiceView | null>(null);
  const [zone, setZone] = useState(p.providerZone);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser timezone is only known after mount
    setZone(browserZone());
  }, []);
  useEffect(() => {
    if (step !== "service") headingRef.current?.focus();
  }, [step]);

  const pick = (s: ServiceView) => {
    setService(s);
    setSlot(null);
    setNotice(null);
    setStep("time");
  };

  async function submit(form: HTMLFormElement) {
    if (!service || !slot) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: p.username,
          serviceId: service.id,
          startsAt: slot,
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          note: fd.get("note"),
          website: fd.get("website"),
          timezone: zone,
          accessToken: p.accessToken ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/b/${data.manageToken}?new=1`);
        return;
      }
      if (data.code === "slot_taken") {
        setNotice(data.error);
        setSlot(null);
        setRefreshKey((k) => k + 1);
        setStep("time");
      } else {
        setError(data.error || dict.common.somethingWrong);
      }
    } catch {
      setError(t.networkError);
    }
    setSubmitting(false);
  }

  const when = slot ? DateTime.fromISO(slot).setZone(zone).setLocale(f.luxon) : null;
  const end = when && service ? when.plus({ minutes: service.duration }) : null;
  const stepNo = { service: 1, time: 2, details: 3 }[step];
  const priceCell = (s: ServiceView) => s.price ?? "";

  return (
    <section aria-labelledby="book-title">
      <ol aria-label={t.stepOf(stepNo, 3)} className="mb-3 flex gap-1.5">
        {t.stepNames.map((l, i) => (
          <li key={l} className={`h-1 flex-1 rounded-full ${i < stepNo ? "bg-accent" : "bg-line"}`}><span className="sr-only">{l}{i + 1 === stepNo ? t.current : i + 1 < stepNo ? t.done : ""}</span></li>
        ))}
      </ol>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 id="book-title" ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus:outline-none">
          {step === "service" && t.chooseService}
          {step === "time" && t.pickTime}
          {step === "details" && t.yourDetails}
        </h2>
        <span className="shrink-0 text-sm text-muted">{t.stepOf(stepNo, 3)}</span>
      </div>

      {step !== "service" && service && (
        <div className="mb-5 flex items-center justify-between gap-3 border-y border-line py-3">
          <span className="min-w-0">
            <span className="block break-words font-medium">{service.name}</span>
            <span className="block text-sm text-muted">
              {service.durationLabel}
              {service.price && ` · ${service.price}`}
            </span>
          </span>
          <button type="button" onClick={() => setStep("service")} className="min-h-11 shrink-0 rounded-xl px-3 font-medium text-accent hover:bg-accent-soft">
            {t.change}
          </button>
        </div>
      )}

      {step === "service" && (
        <ul className="divide-y divide-line border-y border-line">
          {p.services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="group flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-canvas sm:-mx-3 sm:w-[calc(100%+1.5rem)] sm:rounded-xl sm:px-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold">{s.name}</span>
                  {s.description && <span className="mt-0.5 block break-words text-[15px] text-muted">{s.description}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end text-[15px] tabular-nums sm:flex-row sm:gap-6">
                  <span className="text-muted">{s.durationLabel}</span>
                  <span className="min-w-14 text-right font-medium">{priceCell(s)}</span>
                </span>
                <svg viewBox="0 0 8 14" aria-hidden className="h-3.5 w-2 shrink-0 text-muted group-hover:text-accent"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="sr-only">{t.bookSr}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "time" && service && (
        <div>
          <SlotPicker
            username={p.username}
            serviceId={service.id}
            zone={zone}
            onZoneChange={setZone}
            horizonDays={p.horizonDays}
            selected={slot}
            onSelect={setSlot}
            accessToken={p.accessToken}
            notice={notice}
            refreshKey={refreshKey}
          />
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0">
            <button type="button" className={`${btn} w-full py-2 text-center`} disabled={!slot} onClick={() => { setNotice(null); setStep("details"); }}>
              {when ? t.continueWith(when.toFormat(f.dateAtTime)) : t.pickToContinue}
            </button>
          </div>
        </div>
      )}

      {step === "details" && service && when && end && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="space-y-5"
        >
          <div>
            <dl className="divide-y divide-line border-b border-line text-[15px]">
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t.with}</dt><dd className="min-w-0 break-words text-right font-medium">{p.displayName}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t.date}</dt><dd className="text-right font-medium">{when.toFormat(fmt.dateLong)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t.time}</dt><dd className="text-right font-medium">{when.toFormat(f.time)} – {end.toFormat(f.time)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t.timezone}</dt><dd className="text-right font-medium">{zone.replace(/_/g, " ")} ({when.toFormat("ZZZZ")})</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t.where}</dt><dd className="min-w-0 break-words text-right font-medium">{p.location}</dd></div>
            </dl>
            <button type="button" onClick={() => setStep("time")} className="mt-1 min-h-11 font-medium text-accent hover:underline">
              {t.changeTime}
            </button>
          </div>
          <div>
            <label htmlFor="name" className={label}>{t.yourName}</label>
            <input id="name" name="name" required autoComplete="name" className={input} maxLength={100} />
          </div>
          <div>
            <label htmlFor="email" className={label}>{t.email}</label>
            <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className={input} maxLength={200} aria-describedby="email-hint" />
            <p id="email-hint" className={hint}>{p.emailOn === false ? t.emailHintOff(p.displayName.split(" ")[0]) : t.emailHint}</p>
          </div>
          <div>
            <label htmlFor="phone" className={label}>{t.phone} <span className="font-normal text-muted">({dict.common.optional})</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" className={input} maxLength={40} />
          </div>
          <div>
            <label htmlFor="note" className={label}>{t.noteFor(p.displayName.split(" ")[0])} <span className="font-normal text-muted">({dict.common.optional})</span></label>
            <textarea id="note" name="note" rows={3} className={textarea} maxLength={1000} />
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">{t.honeypot}</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {p.mode === "approval" && (
            <p className="rounded-xl bg-warn-soft px-4 py-3 text-[15px] text-warn">
              {t.approvalBefore(p.displayName)}<strong>{t.approvalPending}</strong>{t.approvalAfter(p.pendingHours)}
            </p>
          )}
          {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p>}
          <button type="submit" className={`${btn} w-full`} disabled={submitting}>
            {submitting ? t.submitting : p.mode === "approval" ? t.sendRequest : t.confirm}
          </button>
        </form>
      )}
    </section>
  );
}
