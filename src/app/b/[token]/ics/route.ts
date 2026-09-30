import { appointmentByToken } from "@/lib/booking";
import { getDict } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { getDb } from "@/lib/db";
import { buildIcs } from "@/lib/ics";
import { locationLine, manageUrl } from "@/lib/messages";

export async function GET(req: Request, ctx: RouteContext<"/b/[token]/ics">) {
  const L = localeFromRequest(req);
  const t = getDict(L).emails;
  const { token } = await ctx.params;
  const m = await appointmentByToken(await getDb(), token);
  if (!m) return new Response("Not found", { status: 404 });
  const a = m.appointment;
  const ics = buildIcs({
    uid: `${a.id}@ayslock`,
    start: new Date(a.starts_at),
    end: new Date(a.ends_at),
    summary: t.calendar.title(a.service_name ?? t.appointment, m.provider.display_name),
    location: locationLine(m.provider, L),
    description: `${t.calendar.manage} ${manageUrl(token)}`,
    url: manageUrl(token),
    cancelled: !["pending", "confirmed"].includes(a.status),
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="ayslock-${m.provider.username}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
