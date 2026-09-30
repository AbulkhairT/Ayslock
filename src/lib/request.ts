import { headers } from "next/headers";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local").slice(0, 64);
}

export function ipFrom(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local").slice(0, 64);
}
