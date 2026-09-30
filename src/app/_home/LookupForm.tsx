"use client";

import { useActionState } from "react";
import { lookupProvider, type LookupState } from "../actions";

/** The main action: type the exact username a provider gave you. */
export function LookupForm() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupProvider, {});
  return (
    <form action={action} className="w-full" noValidate>
      <label htmlFor="username" className="mb-2 block text-[15px] font-medium text-muted">
        Enter your provider&apos;s @username.
      </label>
      <div className="flex gap-2">
        <div className={`flex min-w-0 flex-1 items-center rounded-xl border bg-surface pl-4 focus-within:ring-2 focus-within:ring-accent/20 ${state.error ? "border-bad" : "border-line focus-within:border-accent"}`}>
          <span aria-hidden className="text-xl text-muted">@</span>
          <input
            id="username"
            name="username"
            defaultValue={state.value}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="marco"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "lookup-error" : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent pl-1 pr-3 text-xl text-ink placeholder:text-muted/60 focus:outline-none focus-visible:outline-none"
          />
        </div>
        <button type="submit" disabled={pending} className="h-14 shrink-0 rounded-xl bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-70">
          {pending ? "Finding…" : "Find"}
        </button>
      </div>
      {state.error && (
        <p id="lookup-error" role="alert" className="mt-3 text-[15px] text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
