import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { demoStorage } from "./demo-storage";

// Links are signed, not stored: <record id>.<HMAC(purpose:id:version)>. They are
// unguessable (192-bit MAC), scoped to one record and one purpose, and revocable by
// bumping the record's version or changing its status.

let cachedSecret: string | null = null;

function secret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv && fromEnv.length >= 32) return (cachedSecret = fromEnv);
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    // Every server instance must sign links the same way. Without APP_SECRET, derive a key
    // from the database credentials: anyone holding them could read the data anyway.
    // Setting APP_SECRET is still preferred, so rotating DB passwords doesn't void links.
    return (cachedSecret = crypto.createHash("sha256").update(`ayslock-links:${dbUrl}`).digest("hex"));
  }
  // Local demo: generate once and keep it next to the demo database.
  const file = path.join(demoStorage().dir.startsWith("memory://") ? path.join(os.tmpdir(), "ayslock-demo") : path.dirname(demoStorage().dir), "app-secret");
  try {
    cachedSecret = fs.readFileSync(file, "utf8").trim();
  } catch {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    cachedSecret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, cachedSecret, { mode: 0o600 });
  }
  return cachedSecret;
}

function uuidToB64(id: string) {
  return Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url");
}
function b64ToUuid(s: string) {
  const hex = Buffer.from(s, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function mac(purpose: string, id: string, version: number) {
  return crypto.createHmac("sha256", secret()).update(`${purpose}:${id}:${version}`).digest().subarray(0, 24).toString("base64url");
}

export type TokenPurpose = "manage" | "access";

export function signToken(purpose: TokenPurpose, id: string, version = 1): string {
  return `${uuidToB64(id)}.${mac(purpose, id, version)}`;
}

/** Returns the record id if the token is well formed; the caller must then verify it with the stored version. */
export function tokenRecordId(token: string | null | undefined): string | null {
  if (!token || !/^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{32}$/.test(token)) return null;
  return b64ToUuid(token.split(".")[0]);
}

export function verifyToken(purpose: TokenPurpose, token: string, id: string, version = 1): boolean {
  const expected = Buffer.from(signToken(purpose, id, version));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
