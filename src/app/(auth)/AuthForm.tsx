"use client";

import { useActionState } from "react";
import { btn, input, label } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { AuthState } from "./actions";

export function AuthForm({ action, submitLabel, newPassword, username }: { action: (s: AuthState, f: FormData) => Promise<AuthState>; submitLabel: string; newPassword?: boolean; username?: string }) {
  const t = useT().auth;
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {username && <input type="hidden" name="username" value={username} />}
      <div>
        <label htmlFor="email" className={label}>{t.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>{t.password}</label>
        <input id="password" name="password" type="password" required minLength={newPassword ? 8 : undefined} autoComplete={newPassword ? "new-password" : "current-password"} className={input} aria-describedby={newPassword ? "pw-hint" : undefined} />
        {newPassword && <p id="pw-hint" className="mt-1 text-sm text-muted">{t.passwordHint}</p>}
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] text-bad">{state.error}</p>}
      {state.info && <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 text-[15px] text-ok">{state.info}</p>}
      <button type="submit" className={`${btn} w-full`} disabled={pending}>
        {pending ? t.pending : submitLabel}
      </button>
    </form>
  );
}
