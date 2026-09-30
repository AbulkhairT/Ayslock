import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { modes } from "@/lib/env";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { btnSmall, btnSmallAccent } from "@/components/ui";
import { fastForward, runWorker } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: (await getT()).dashboard.outbox.metaTitle, robots: { index: false } };
}

const TONE: Record<string, string> = {
  previewed: "bg-ok-soft text-ok",
  queued: "bg-accent-soft text-accent-strong",
  cancelled: "bg-canvas text-muted",
  skipped: "bg-canvas text-muted",
  failed: "bg-bad-soft text-bad",
  sending: "bg-warn-soft text-warn",
};

export default async function Outbox() {
  // Demo deployments only (simulated sign-in): with real auth this page never exists.
  if (!(modes.auth === "demo" && modes.email === "preview")) notFound();
  const rows = await (await getDb()).query<{ id: string; kind: string; to_email: string; subject: string; body: string; status: string; send_after: Date; sent_at: Date | null; for_starts_at: Date | null }>(
    `select id, kind, to_email, subject, body, status, send_after, sent_at, for_starts_at from notifications order by created_at desc limit 100`,
  );
  const t = (await getT()).dashboard.outbox;
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 pb-16 pt-6">
      <div className="flex items-center justify-between gap-2">
        <Logo />
        <LanguageSwitch />
      </div>
      <div className="mt-6 rounded-2xl border-2 border-dashed border-warn/50 bg-warn-soft p-5 text-warn">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm">
          {t.leadBefore}<code>RESEND_API_KEY</code>{t.leadAnd}<code>EMAIL_FROM</code>{t.leadAfter}
        </p>
        <form action={runWorker} className="mt-3"><button className={btnSmallAccent}>{t.runWorker}</button></form>
      </div>
      <p className="mt-4 text-sm text-muted">{t.legend}</p>
      {rows.length === 0 && <p className="mt-8 text-center text-muted">{t.empty}</p>}
      <ul className="mt-4 space-y-3">
        {rows.map((n) => (
          <li key={n.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{n.kind.replace(/_/g, " ")} → {n.to_email}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[n.status] ?? ""}`}>
                {n.status === "previewed" ? t.previewed : n.status === "queued" ? t.queuedFor(new Date(n.send_after).toISOString().replace("T", " ").slice(0, 16)) : t.status[n.status] ?? n.status}
              </span>
            </div>
            <p className="mt-2 font-semibold">{n.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-muted">{n.body}</pre>
            {n.status === "queued" && n.kind === "reminder" && (
              <form action={fastForward} className="mt-3">
                <input type="hidden" name="id" value={n.id} />
                <button className={btnSmall}>{t.fastForward}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
