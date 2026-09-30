import { headers } from "next/headers";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local").slice(0, 64);
}

export function ipFrom(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local").slice(0, 64);
}

/**
 * The address this request came in on, e.g. https://ayslock.vercel.app. Email links are built from it,
 * so they always point back to the live site, even if APP_URL is missing or still says localhost.
 */
export async function requestOrigin(fallback: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host");
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return fallback;
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
