"use client";

import { useActionState, useEffect, useState } from "react";
import { HoursEditor } from "@/components/HoursEditor";
import { TimezoneSelect, browserZone } from "@/components/TimezoneSelect";
import { btn, btnSecondary, hint, input, label, textarea } from "@/components/ui";
import { DEFAULT_HOURS } from "@/lib/hours";
import { createProfile, type OnboardState } from "./actions";

interface Svc {
  name: string;
  duration_minutes: number;
  price: string;
  description: string;
}

const STEPS = ["About you", "Services", "Hours"];

export function OnboardingForm({ appHost, initialUsername = "" }: { appHost: string; initialUsername?: string }) {
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
      <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={`border-t-2 pt-2 text-sm font-medium ${step >= i + 1 ? "border-ink text-ink" : "border-line text-muted"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {state.error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{state.error}</p>}

      <section hidden={step !== 1} className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6">
        <div>
          <label htmlFor="display_name" className={label}>Your name</label>
          <input id="display_name" name="display_name" maxLength={80} className={input} placeholder="Jordan Lee" />
        </div>
        <div>
          <label htmlFor="username" className={label}>Username</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">@</span>
            <input id="username" name="username" maxLength={31} value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} pl-9`} placeholder="jordan" aria-describedby="username-hint" />
          </div>
          <p id="username-hint" className={hint}>
            3–30 letters, numbers or underscores. Your link: <strong className="text-ink">{appHost}/@{cleanUsername || "you"}</strong>
          </p>
        </div>
        <div>
          <span className={label}>Timezone</span>
          <input type="hidden" name="timezone" value={zone} />
          <TimezoneSelect value={zone} onChange={setZone} id="timezone" labelText="Your hours are in" />
        </div>
        <div>
          <label htmlFor="bio" className={label}>Short bio <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="bio" name="bio" rows={3} maxLength={500} className={textarea} placeholder="What you do and who you do it for." />
        </div>
        <fieldset>
          <legend className={label}>Where do appointments happen?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["in_person", "online"] as const).map((k) => (
              <label key={k} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border text-sm font-semibold ${locationKind === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                <input type="radio" name="location_kind" value={k} checked={locationKind === k} onChange={() => setLocationKind(k)} className="sr-only" />
                {k === "in_person" ? "In person" : "Online"}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="location_text" className={label}>{locationKind === "online" ? "Meeting details" : "Address or area"}</label>
          <input id="location_text" name="location_text" maxLength={200} className={input} placeholder={locationKind === "online" ? "Video call link sent after booking" : "12 Main St, Springfield"} />
        </div>
        <input type="hidden" name="avatar_url" value="" />
        <button type="button" className={`${btn} w-full`} onClick={() => setStep(2)}>Next: services</button>
      </section>

      <section hidden={step !== 2} className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6">
        <p className="text-sm text-muted">What can clients book? You can change these anytime.</p>
        <input type="hidden" name="services" value={JSON.stringify(services)} />
        {services.map((s, i) => (
          <fieldset key={i} className="space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">Service {i + 1}</legend>
            <div>
              <label htmlFor={`svc-name-${i}`} className={label}>Name</label>
              <input id={`svc-name-${i}`} value={s.name} onChange={(e) => updateSvc(i, { name: e.target.value })} maxLength={80} className={input} placeholder="Haircut" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`svc-dur-${i}`} className={label}>Length</label>
                <select id={`svc-dur-${i}`} value={s.duration_minutes} onChange={(e) => updateSvc(i, { duration_minutes: Number(e.target.value) })} className={input}>
                  {[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map((m) => (
                    <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`svc-price-${i}`} className={label}>Price <span className="font-normal text-muted">(optional)</span></label>
                <input id={`svc-price-${i}`} value={s.price} onChange={(e) => updateSvc(i, { price: e.target.value })} inputMode="decimal" maxLength={12} className={input} placeholder="40" />
              </div>
            </div>
            {services.length > 1 && (
              <button type="button" onClick={() => setServices((all) => all.filter((_, j) => j !== i))} className="min-h-11 text-sm font-semibold text-bad">
                Remove
              </button>
            )}
          </fieldset>
        ))}
        <button type="button" className={`${btnSecondary} w-full`} onClick={() => setServices((s) => [...s, { name: "", duration_minutes: 30, price: "", description: "" }])}>
          + Add another service
        </button>
        <div>
          <label htmlFor="currency" className={label}>Currency for prices</label>
          <select id="currency" name="currency" className={input} defaultValue="USD">
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => setStep(1)}>Back</button>
          <button type="button" className={`${btn} flex-1`} onClick={() => setStep(3)}>Next: hours</button>
        </div>
      </section>

      <section hidden={step !== 3} className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6">
        <p className="text-sm text-muted">When can clients book you? We filled in Monday to Friday, 10:00 to 19:00. Adjust as you like.</p>
        <HoursEditor initial={DEFAULT_HOURS} />
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => setStep(2)}>Back</button>
          <button type="submit" className={`${btn} flex-1`} disabled={pending}>{pending ? "Creating…" : "Create my Ayslock"}</button>
        </div>
      </section>
    </form>
  );
}
