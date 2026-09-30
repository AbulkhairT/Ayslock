"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SlotPicker } from "@/components/SlotPicker";
import { browserZone } from "@/components/TimezoneSelect";
import { btn, input, label, textarea } from "@/components/ui";

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
}

type Step = "service" | "time" | "details";

export function BookingFlow(p: Props) {
  const router = useRouter();
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
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("We couldn't reach Ayslock. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  const when = slot ? DateTime.fromISO(slot).setZone(zone) : null;
  const end = when && service ? when.plus({ minutes: service.duration }) : null;
  const stepNo = { service: 1, time: 2, details: 3 }[step];

  return (
    <section aria-labelledby="book-title" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="book-title" ref={headingRef} tabIndex={-1} className="text-lg font-bold tracking-tight focus:outline-none">
          {step === "service" && "Choose a service"}
          {step === "time" && "Pick a time"}
          {step === "details" && "Your details"}
        </h2>
        <span className="text-sm font-semibold text-muted">Step {stepNo} of 3</span>
      </div>

      {step !== "service" && service && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-canvas px-4 py-3 text-sm">
          <span>
            <strong>{service.name}</strong> · {service.durationLabel}
            {service.price && ` · ${service.price}`}
          </span>
          <button type="button" onClick={() => setStep("service")} className="min-h-11 font-semibold text-accent">
            Change
          </button>
        </div>
      )}

      {step === "service" && (
        <ul className="space-y-3">
          {p.services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-ink"
              >
                <span>
                  <span className="block text-base font-semibold">{s.name}</span>
                  <span className="block text-sm text-muted">
                    {s.durationLabel}
                    {s.price && ` · ${s.price}`}
                  </span>
                  {s.description && <span className="mt-1 block text-sm text-muted">{s.description}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Book</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "time" && service && (
        <div className="space-y-5">
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
          <button type="button" className={`${btn} w-full`} disabled={!slot} onClick={() => { setNotice(null); setStep("details"); }}>
            {when ? `Continue with ${when.toFormat("ccc, LLL d 'at' h:mm a")}` : "Pick a time to continue"}
          </button>
        </div>
      )}

      {step === "details" && service && when && end && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="space-y-4"
        >
          <dl className="grid gap-1 rounded-2xl border border-line p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">With</dt><dd className="text-right font-semibold">{p.displayName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Date</dt><dd className="text-right font-semibold">{when.toFormat("cccc, LLLL d, yyyy")}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Time</dt><dd className="text-right font-semibold">{when.toFormat("h:mm a")} – {end.toFormat("h:mm a")}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Timezone</dt><dd className="text-right font-semibold">{zone.replace(/_/g, " ")} ({when.toFormat("ZZZZ")})</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Where</dt><dd className="text-right font-semibold">{p.location}</dd></div>
            <button type="button" onClick={() => setStep("time")} className="mt-1 min-h-11 justify-self-start font-semibold text-accent">
              Change time
            </button>
          </dl>
          <div>
            <label htmlFor="name" className={label}>Your name</label>
            <input id="name" name="name" required autoComplete="name" className={input} maxLength={100} />
          </div>
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className={input} maxLength={200} aria-describedby="email-hint" />
            <p id="email-hint" className="mt-1 text-sm text-muted">We send your confirmation and a link to change the booking.</p>
          </div>
          <div>
            <label htmlFor="phone" className={label}>Phone <span className="font-normal text-muted">(optional)</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" className={input} maxLength={40} />
          </div>
          <div>
            <label htmlFor="note" className={label}>Note for {p.displayName.split(" ")[0]} <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="note" name="note" rows={3} className={textarea} maxLength={1000} />
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Leave this empty</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {p.mode === "approval" && (
            <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
              {p.displayName} approves each booking. Your time is held as <strong>pending</strong> for up to {p.pendingHours} hours while they review it.
            </p>
          )}
          {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          <button type="submit" className={`${btn} w-full`} disabled={submitting}>
            {submitting ? "Booking…" : p.mode === "approval" ? "Send booking request" : "Confirm booking"}
          </button>
        </form>
      )}
    </section>
  );
}
