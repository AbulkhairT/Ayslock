"use client";

import { useActionState } from "react";
import { lookupProvider, type LookupState } from "../actions";

/** The one thing a client does on the home page: type an exact username. */
export function LookupForm() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupProvider, {});
  return (
    <form action={action} className="w-full" noValidate>
      <label htmlFor="username" className="mb-2 block text-[15px] font-medium text-[#5b554c]">
        Enter your provider&apos;s @username.
      </label>
      <div className="flex items-end gap-3">
        <div className="relative flex-1 border-b-2 border-[#1a1714]">
          <span aria-hidden className="pointer-events-none absolute bottom-2 left-0 font-[family-name:var(--font-serif)] text-4xl text-[#1a1714]/40 sm:text-5xl">@</span>
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
            className="block h-16 w-full bg-transparent pl-8 font-[family-name:var(--font-serif)] text-4xl text-[#1a1714] placeholder:text-[#1a1714]/25 focus:outline-none sm:pl-10 sm:text-5xl"
          />
        </div>
        <button type="submit" disabled={pending} className="mb-1 h-12 shrink-0 rounded-[10px] bg-[#1a1714] px-5 text-base font-semibold text-[#f3eee4] transition hover:bg-[#3a342d] disabled:opacity-60">
          {pending ? "Looking…" : "Find"}
        </button>
      </div>
      {state.error && (
        <p id="lookup-error" role="alert" className="mt-4 max-w-md border-l-4 border-[#c2410c] bg-[#fff6ea] px-4 py-3 text-sm text-[#7c2d12]">
          {state.error}
        </p>
      )}
    </form>
  );
}
