import { NextResponse } from "next/server";
import { localizeError } from "@/i18n";
import { localeFromRequest } from "@/i18n/server";
import { requestAccess } from "@/lib/access";
import { ipFrom } from "@/lib/request";

export async function POST(req: Request) {
  const L = localeFromRequest(req);
  try {
    const body = await req.json();
    await requestAccess(body && typeof body === "object" ? { ...body, locale: L } : body, { ip: ipFrom(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: localizeError((e as Error).message || "Something went wrong.", L) }, { status: 400 });
  }
}
