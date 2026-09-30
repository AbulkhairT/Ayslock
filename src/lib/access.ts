import { z } from "zod";
import { getDb, type Queryable } from "./db";
import { emails, accessUrl } from "./messages";
import { enqueue, sendSoon } from "./notify";
import { providerByUsername } from "./providers";
import { rateLimit } from "./ratelimit";
import { signToken, tokenRecordId, verifyToken } from "./tokens";
import type { Provider } from "./types";
import { isLocale } from "@/i18n/config";

export interface AccessGrant {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "declined" | "revoked";
  expires_at: Date | null;
  created_at: Date;
}

/**
 * Private mode gate. A token is valid only if it is signed for this grant, the grant
 * belongs to this provider, is approved, not revoked and not expired.
 */
export async function verifyAccess(q: Queryable, provider: Provider, token: string | null | undefined): Promise<AccessGrant | null> {
  const id = tokenRecordId(token);
  if (!id || !token) return null;
  if (!verifyToken("access", token, id)) return null;
  const rows = await q.query<AccessGrant>(
    `select id, name, email, message, status, expires_at, created_at from access_grants
     where id = $1 and provider_id = $2 and status = 'approved' and expires_at > now()`,
    [id, provider.id],
  );
  return rows[0] ?? null;
}

export const accessRequestInput = z.object({
  username: z.string().min(1).max(40),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(200),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
  locale: z.enum(["en", "ru"]).optional(),
});

export async function requestAccess(raw: unknown, ctx: { ip?: string } = {}) {
  const parsed = accessRequestInput.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check your details.");
  const input = parsed.data;
  const db = await getDb();
  const provider = await providerByUsername(db, input.username);
  if (!provider || provider.access_mode !== "private") throw new Error("This provider isn't taking access requests.");
  if (ctx.ip) await rateLimit(db, `access:${ctx.ip}`, 5, 3600);
  await rateLimit(db, `access-email:${input.email}:${provider.id}`, 3, 86400);
  await db.tx(async (q) => {
    const existing = await q.query(`select 1 from access_grants where provider_id = $1 and email = $2 and status = 'pending'`, [provider.id, input.email]);
    if (existing.length) return; // already waiting; don't spam the provider
    const [g] = await q.query<{ id: string }>(
      `insert into access_grants (provider_id, name, email, message, locale) values ($1, $2, $3, $4, $5) returning id`,
      [provider.id, input.name, input.email, input.message || "", input.locale ?? "en"],
    );
    await enqueue(q, { providerId: provider.id, accessGrantId: g.id, kind: "access_requested", to: provider.email, ...emails.accessRequested(provider, input.name, input.email, input.message || ""), dedupeKey: `access_requested:${g.id}` });
  });
  sendSoon(db);
}

export async function listAccessGrants(q: Queryable, provider: Provider) {
  return q.query<AccessGrant>(
    `select id, name, email, message, status, expires_at, created_at from access_grants
     where provider_id = $1 order by (status = 'pending') desc, created_at desc limit 200`,
    [provider.id],
  );
}

export function accessLink(provider: Provider, grantId: string) {
  return accessUrl(provider.username, signToken("access", grantId));
}

export async function approveAccess(provider: Provider, grantId: string) {
  const db = await getDb();
  const link = await db.tx(async (q) => {
    const [g] = await q.query<AccessGrant & { locale: string }>(
      `update access_grants set status = 'approved', decided_at = now(), expires_at = now() + make_interval(days => $3)
       where id = $1 and provider_id = $2 and status = 'pending'
       returning id, name, email, message, status, expires_at, created_at, locale`,
      [grantId, provider.id, provider.access_link_days],
    );
    if (!g) throw new Error("This request was already handled.");
    const link = accessLink(provider, g.id);
    await enqueue(q, { providerId: provider.id, accessGrantId: g.id, kind: "access_approved", to: g.email, ...emails.accessApproved(provider, g.name, link, new Date(g.expires_at!), isLocale(g.locale) ? g.locale : "en"), dedupeKey: `access_approved:${g.id}` });
    return link;
  });
  sendSoon(db);
  return link;
}

export async function declineAccess(provider: Provider, grantId: string) {
  const db = await getDb();
  await db.tx(async (q) => {
    const [g] = await q.query<AccessGrant & { locale: string }>(
      `update access_grants set status = 'declined', decided_at = now() where id = $1 and provider_id = $2 and status = 'pending'
       returning id, name, email, message, status, expires_at, created_at, locale`,
      [grantId, provider.id],
    );
    if (!g) throw new Error("This request was already handled.");
    await enqueue(q, { providerId: provider.id, accessGrantId: g.id, kind: "access_declined", to: g.email, ...emails.accessDeclined(provider, g.name, isLocale(g.locale) ? g.locale : "en"), dedupeKey: `access_declined:${g.id}` });
  });
  sendSoon(db);
}

export async function revokeAccess(provider: Provider, grantId: string) {
  const db = await getDb();
  await db.query(`update access_grants set status = 'revoked', decided_at = now() where id = $1 and provider_id = $2 and status = 'approved'`, [grantId, provider.id]);
}

export async function providerForAccessRequest(username: string) {
  const db = await getDb();
  return providerByUsername(db, username);
}
