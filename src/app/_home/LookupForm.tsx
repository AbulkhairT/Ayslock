"use client";

import { useActionState } from "react";
import { lookupProvider, type LookupState } from "../actions";
import { btn } from "@/components/ui";

export function LookupForm() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupProvider, {});
  return (
    <form action={action} className="w-full" noValidate>
      <label htmlFor="username" className="mb-3 block text-lg font-semibold">
        Enter your provider&apos;s @username.
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted">
            @
          </span>
          <input
            id="username"
            name="username"
            defaultValue={state.value}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            placeholder="marco"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "lookup-error" : undefined}
            className="block min-h-14 w-full rounded-full border border-line bg-white pl-11 pr-5 text-xl text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
          />
        </div>
        <button type="submit" className={`${btn} min-h-14 px-8 text-lg`} disabled={pending}>
          {pending ? "Looking…" : "Find"}
        </button>
      </div>
      {state.error && (
        <p id="lookup-error" role="alert" className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {state.error}
        </p>
      )}
    </form>
  );
}
