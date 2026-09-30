// Shared class names: one control height (48px, 44px for compact), 12px corners on controls,
// 16px on grouped containers, and the accent reserved for the primary action and selection.
export const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted";
export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-base font-semibold text-ink transition-colors hover:border-ink/40 disabled:opacity-50";
export const btnSmall =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40 disabled:opacity-50";
export const btnSmallAccent =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-bad/30 bg-surface px-4 text-sm font-semibold text-bad transition-colors hover:bg-bad-soft";
export const btnLink = "inline-flex min-h-11 items-center font-semibold text-accent hover:underline";
export const input =
  "block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
export const textarea =
  "block w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
export const label = "mb-1.5 block text-sm font-semibold text-ink";
export const hint = "mt-1.5 text-sm text-muted";
export const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
export const h1 = "text-[28px] font-semibold leading-tight tracking-tight";
export const h2 = "text-lg font-semibold tracking-tight";
/** Small uppercase label above a group of rows. */
export const eyebrow = "text-[13px] font-semibold uppercase tracking-wide text-muted";
