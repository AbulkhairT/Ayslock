"use client";

import { useActionState } from "react";
import { lookupProvider, type LookupState } from "../actions";

/** For clients: type the exact username a provider gave you. */
export function LookupForm() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupProvider, {});
  return (
    <form action={action} className="w-full" noValidate>
      <label htmlFor="username" className="mb-2 block text-sm font-medium text-muted">
        Enter your provider&apos;s @username.
      </label>
      <div className="flex items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 focus-within:border-ink">
        <span aria-hidden className="text-lg text-muted">@</span>
        <input
          id="username"
          name="username"
          defaultValue={state.value}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="marco"
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "lookup-error" : undefined}
          className="min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-muted/50 focus:outline-none focus-visible:outline-none"
        />
        <button type="submit" disabled={pending} className="h-11 shrink-0 rounded-full border border-line px-5 text-base font-semibold text-ink transition hover:border-ink disabled:opacity-60">
          {pending ? "Looking…" : "Find"}
        </button>
      </div>
      {state.error && (
        <p id="lookup-error" role="alert" className="mt-3 pl-5 text-sm text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
