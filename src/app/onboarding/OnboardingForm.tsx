"use client";

import { useActionState, useEffect, useState } from "react";
import { HoursEditor } from "@/components/HoursEditor";
import { TimezoneSelect, browserZone } from "@/components/TimezoneSelect";
import { btn, btnSecondary, hint, input, label, textarea } from "@/components/ui";
import { useLocale, useT } from "@/i18n/client";
import { fmtDuration } from "@/lib/format";
import { DEFAULT_HOURS } from "@/lib/hours";
import { createProfile, type OnboardState } from "./actions";

interface Svc {
  name: string;
  duration_minutes: number;
  price: string;
  description: string;
}

export function OnboardingForm({ appHost, initialUsername = "" }: { appHost: string; initialUsername?: string }) {
  const locale = useLocale();
  const dict = useT();
  const t = dict.onboarding;
  const { optional: opt, back } = dict.common;
  const [state, action, pending] = useActionState<OnboardState, FormData>(createProfile, {});
  const [step, setStep] = useState(1);
  const [zone, setZone] = useState("UTC");
  const [username, setUsername] = useState(initialUsername);
  const [locationKind, setLocationKind] = useState<"in_person" | "online">("in_person");
  const [services, setServices] = useState<Svc[]>([{ name: "", duration_minutes: 60, price: "", description: "" }]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser timezone is only known after mount
    setZone(browserZone());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jump to the step the server rejected
    if (state.step) setStep(state.step);
  }, [state]);

  const updateSvc = (i: number, patch: Partial<Svc>) => setServices((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const cleanUsername = username.trim().replace(/^@+/, "").toLowerCase();

  return (
    <form action={action} className="space-y-6">
      <ol className="grid grid-cols-3 gap-2" aria-label={t.progress}>
        {t.steps.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={`border-t-2 pt-2 text-sm font-medium ${step >= i + 1 ? "border-accent text-ink" : "border-line text-muted"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {state.error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">{state.error}</p>}

      <section hidden={step !== 1} className="space-y-4">
        <div>
          <label htmlFor="display_name" className={label}>{t.name}</label>
          <input id="display_name" name="display_name" maxLength={80} className={input} placeholder={t.namePlaceholder} />
        </div>
        <div>
          <label htmlFor="profession" className={label}>{t.profession} <span className="font-normal text-muted">({opt})</span></label>
          <input id="profession" name="profession" maxLength={60} className={input} placeholder={t.professionPlaceholder} />
          <p className={hint}>{t.professionHint}</p>
        </div>
        <div>
          <label htmlFor="username" className={label}>{t.username}</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">@</span>
            <input id="username" name="username" maxLength={31} value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} pl-9`} placeholder={t.usernamePlaceholder} aria-describedby="username-hint" />
          </div>
          <p id="username-hint" className={hint}>
            {t.usernameHint} <strong className="text-ink">{appHost}/@{cleanUsername || t.usernameYou}</strong>
          </p>
        </div>
        <div>
          <span className={label}>{t.timezone}</span>
          <input type="hidden" name="timezone" value={zone} />
          <TimezoneSelect value={zone} onChange={setZone} id="timezone" labelText={t.timezoneLabel} />
        </div>
        <div>
          <label htmlFor="bio" className={label}>{t.bio} <span className="font-normal text-muted">({opt})</span></label>
          <textarea id="bio" name="bio" rows={3} maxLength={500} className={textarea} placeholder={t.bioPlaceholder} />
        </div>
        <fieldset>
          <legend className={label}>{t.where}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["in_person", "online"] as const).map((k) => (
              <label key={k} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${locationKind === k ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white"}`}>
                <input type="radio" name="location_kind" value={k} checked={locationKind === k} onChange={() => setLocationKind(k)} className="sr-only" />
                {k === "in_person" ? t.inPerson : t.online}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="location_text" className={label}>{locationKind === "online" ? t.meetingDetails : t.address}</label>
          <input id="location_text" name="location_text" maxLength={200} className={input} placeholder={locationKind === "online" ? t.meetingPlaceholder : t.addressPlaceholder} />
        </div>
        <input type="hidden" name="avatar_url" value="" />
        <button type="button" className={`${btn} w-full`} onClick={() => setStep(2)}>{t.nextServices}</button>
      </section>

      <section hidden={step !== 2} className="space-y-4">
        <p className="text-sm text-muted">{t.servicesLead}</p>
        <input type="hidden" name="services" value={JSON.stringify(services)} />
        {services.map((s, i) => (
          <fieldset key={i} className="space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">{t.service(i + 1)}</legend>
            <div>
              <label htmlFor={`svc-name-${i}`} className={label}>{t.serviceName}</label>
              <input id={`svc-name-${i}`} value={s.name} onChange={(e) => updateSvc(i, { name: e.target.value })} maxLength={80} className={input} placeholder={t.serviceNamePlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`svc-dur-${i}`} className={label}>{t.length}</label>
                <select id={`svc-dur-${i}`} value={s.duration_minutes} onChange={(e) => updateSvc(i, { duration_minutes: Number(e.target.value) })} className={input}>
                  {[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map((m) => (
                    <option key={m} value={m}>{fmtDuration(m, locale)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`svc-price-${i}`} className={label}>{t.price} <span className="font-normal text-muted">({opt})</span></label>
                <input id={`svc-price-${i}`} value={s.price} onChange={(e) => updateSvc(i, { price: e.target.value })} inputMode="decimal" maxLength={12} className={input} placeholder="40" />
              </div>
            </div>
            {services.length > 1 && (
              <button type="button" onClick={() => setServices((all) => all.filter((_, j) => j !== i))} className="min-h-11 text-sm font-semibold text-bad">
                {t.remove}
              </button>
            )}
          </fieldset>
        ))}
        <button type="button" className={`${btnSecondary} w-full`} onClick={() => setServices((s) => [...s, { name: "", duration_minutes: 30, price: "", description: "" }])}>
          {t.addService}
        </button>
        <div>
          <label htmlFor="currency" className={label}>{t.currency}</label>
          <select id="currency" name="currency" className={input} defaultValue="USD">
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => setStep(1)}>{back}</button>
          <button type="button" className={`${btn} flex-1`} onClick={() => setStep(3)}>{t.nextHours}</button>
        </div>
      </section>

      <section hidden={step !== 3} className="space-y-4">
        <p className="text-sm text-muted">{t.hoursLead}</p>
        <HoursEditor initial={DEFAULT_HOURS} />
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => setStep(2)}>{back}</button>
          <button type="submit" className={`${btn} flex-1`} disabled={pending}>{pending ? t.creating : t.create}</button>
        </div>
      </section>
    </form>
  );
}
