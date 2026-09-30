import { NextResponse } from "next/server";
import { requestAccess } from "@/lib/access";
import { ipFrom } from "@/lib/request";

export async function POST(req: Request) {
  try {
    await requestAccess(await req.json(), { ip: ipFrom(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Something went wrong." }, { status: 400 });
  }
}
