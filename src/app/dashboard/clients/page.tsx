import Link from "next/link";
import { getDb } from "@/lib/db";
import { fmtShortDate } from "@/lib/format";
import { requireProvider } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients · Ayslock" };

export default async function Clients({ searchParams }: PageProps<"/dashboard/clients">) {
  const provider = await requireProvider();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const rows = await (await getDb()).query<{ id: string; name: string; email: string; visits: number; last_visit: Date | null; next_visit: Date | null }>(
    `select c.id, c.name, c.email,
       count(a.id) filter (where a.status = 'confirmed' and a.starts_at < now())::int as visits,
       max(a.starts_at) filter (where a.status = 'confirmed' and a.starts_at < now()) as last_visit,
       min(a.starts_at) filter (where a.status in ('confirmed', 'pending') and a.starts_at >= now()) as next_visit
     from clients c left join appointments a on a.client_id = c.id and a.provider_id = c.provider_id
     where c.provider_id = $1 and ($2 = '' or c.name ilike '%' || $2 || '%' or c.email ilike '%' || $2 || '%')
     group by c.id order by coalesce(min(a.starts_at) filter (where a.starts_at >= now()), max(a.starts_at)) desc nulls last, c.name
     limit 500`,
    [provider.id, q],
  );
  const zone = provider.timezone;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Clients</h1>
        <form role="search" className="w-full sm:w-64">
          <label htmlFor="q" className="sr-only">Search your clients</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search your clients" className="min-h-11 w-full rounded-xl border border-line bg-white px-4 text-sm focus:border-accent focus:outline-none" />
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="border-y border-line py-10 text-center text-muted">
          {q ? "No clients match that search." : "Clients appear here after their first booking."}
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/clients/${c.id}`} className="flex min-h-16 items-center justify-between gap-3 py-3 hover:bg-canvas sm:-mx-3 sm:rounded-xl sm:px-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block truncate text-sm text-muted">{c.email}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted">
                  {c.next_visit ? <span className="block font-semibold text-accent">Next {fmtShortDate(c.next_visit, zone)}</span> : c.last_visit && <span className="block">Last {fmtShortDate(c.last_visit, zone)}</span>}
                  <span className="block">{c.visits} {c.visits === 1 ? "visit" : "visits"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
