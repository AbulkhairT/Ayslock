import { cookies } from "next/headers";
import { getDb } from "./db";
import { demo, env, modes } from "./env";
import { checkPassword, hashPassword } from "./password";
import { rateLimit } from "./ratelimit";
import { supabaseServer } from "./supabase/server";
import { randomToken, sha256 } from "./tokens";

export interface User {
  id: string;
  email: string;
}

const DEMO_COOKIE = "ays_demo_session";

// ---- Local demo sign-in (simulated; used only when Supabase is not configured) ----

export async function demoCreateUser(email: string, password: string) {
  if (!demo.allowed) throw new Error("Simulated sign-in is off on this site.");
  const db = await getDb();
  const rows = await db.query<{ id: string }>(
    `insert into demo_users (email, password_hash) values ($1, $2) on conflict (email) do nothing returning id`,
    [email.toLowerCase(), hashPassword(password)],
  );
  return rows[0]?.id ?? null;
}

async function demoStartSession(userId: string) {
  const db = await getDb();
  const token = randomToken();
  await db.query(`insert into demo_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '30 days')`, [sha256(token), userId]);
  (await cookies()).set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400, secure: process.env.NODE_ENV === "production" });
}

// ---- Public API ----

export async function currentUser(): Promise<User | null> {
  if (modes.auth === "supabase") {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  }
  const token = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.query<User>(
    `select u.id, u.email from demo_sessions s join demo_users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export type AuthResult = { ok: true; confirmEmail?: boolean } | { ok: false; error: string };

export async function signUp(email: string, password: string, ip: string, next = "/onboarding", origin = env.appUrl): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email." };
  if (password.length < 8) return { ok: false, error: "Use a password with at least 8 characters." };
  const db = await getDb();
  try {
    await rateLimit(db, `signup:${ip}`, 10, 3600);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (modes.auth === "supabase") {
    const supabase = await supabaseServer();
    // The confirmation email links back here, then on to setup (with the claimed username).
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) return { ok: false, error: error.code === "user_already_exists" ? "An account with this email already exists. Try logging in." : error.message };
    // With email confirmation on, Supabase hides existing accounts by returning a user with no identities.
    if (!data.session && data.user && data.user.identities?.length === 0) return { ok: false, error: "An account with this email already exists. Try logging in." };
    return { ok: true, confirmEmail: !data.session };
  }
  const id = await demoCreateUser(email, password);
  if (!id) return { ok: false, error: "An account with this email already exists. Try logging in." };
  await demoStartSession(id);
  return { ok: true };
}

export async function signIn(email: string, password: string, ip: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  const db = await getDb();
  try {
    await rateLimit(db, `signin:${ip}:${email}`, 10, 900);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (modes.auth === "supabase") {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === "email_not_confirmed") return { ok: false, error: "Confirm your email first. Check your inbox for the link we sent." };
    return error ? { ok: false, error: "That email and password don't match." } : { ok: true };
  }
  const rows = await db.query<{ id: string; password_hash: string }>(`select id, password_hash from demo_users where email = $1`, [email]);
  if (!rows[0] || !checkPassword(password, rows[0].password_hash)) return { ok: false, error: "That email and password don't match." };
  await demoStartSession(rows[0].id);
  return { ok: true };
}

export async function signOut() {
  if (modes.auth === "supabase") {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    return;
  }
  const store = await cookies();
  const token = store.get(DEMO_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.query(`delete from demo_sessions where token_hash = $1`, [sha256(token)]);
  }
  store.delete(DEMO_COOKIE);
}
