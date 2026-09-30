import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { fmtDate, fmtTime } from "@/lib/format";
import { requireProvider } from "@/lib/session";
import { btnSmallAccent, textarea } from "@/components/ui";
import { saveClientNotes } from "../../actions";
import { Flash } from "../../Flash";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  confirmed: "bg-ok-soft text-ok",
  pending: "bg-warn-soft text-warn",
  cancelled: "bg-canvas text-muted",
  declined: "bg-canvas text-muted",
  expired: "bg-canvas text-muted",
};

export default async function ClientPage({ params, searchParams }: PageProps<"/dashboard/clients/[id]">) {
  const provider = await requireProvider();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  // Scoped by provider_id: a provider can only ever open their own clients.
  const [client] = await db.query<{ id: string; name: string; email: string; phone: string | null; notes: string }>(
    `select id, name, email, phone, notes from clients where id = $1 and provider_id = $2`,
    [id, provider.id],
  );
  if (!client) notFound();
  const history = await db.query<{ id: string; status: string; starts_at: Date; service_name: string; client_note: string | null }>(
    `select id, status, starts_at, service_name, client_note from appointments where client_id = $1 and provider_id = $2 order by starts_at desc limit 200`,
    [id, provider.id],
  );
  const zone = provider.timezone;
  return (
    <div className="space-y-4">
      <Link href="/dashboard/clients" className="inline-block min-h-11 py-2.5 text-sm font-semibold text-muted">← All clients</Link>
      <Flash sp={sp} />
      <section className="rounded-3xl border border-line bg-white p-5">
        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        <p className="text-muted">
          <a href={`mailto:${client.email}`} className="text-accent">{client.email}</a>
          {client.phone && <> · <a href={`tel:${client.phone}`} className="text-accent">{client.phone}</a></>}
        </p>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <form action={saveClientNotes} className="space-y-3">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="back" value={`/dashboard/clients/${client.id}`} />
          <label htmlFor="notes" className="block font-bold">Private notes</label>
          <p className="text-sm text-muted">Only you can see these. Clients never do.</p>
          <textarea id="notes" name="notes" rows={4} defaultValue={client.notes} maxLength={5000} className={textarea} />
          <button className={btnSmallAccent}>Save notes</button>
        </form>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="mb-2 font-bold">History</h2>
        {history.length === 0 ? <p className="text-sm text-muted">No appointments yet.</p> : (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{h.service_name}</span>
                  <span className="block text-sm text-muted">{fmtDate(h.starts_at, zone)}, {fmtTime(h.starts_at, zone)}</span>
                  {h.client_note && <span className="block text-sm">&ldquo;{h.client_note}&rdquo;</span>}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${BADGE[h.status]}`}>{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
