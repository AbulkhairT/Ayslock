/**
 * Integration tests for the booking rules that matter most: concurrent booking,
 * pending expiry, reminders and private access. Runs on in-memory PGlite by default,
 * or on a real Postgres server when TEST_DATABASE_URL is set (npm run test:pg).
 */
import { beforeAll, describe, expect, it } from "vitest";

const PG = process.env.TEST_DATABASE_URL;
if (PG) process.env.DATABASE_URL = PG;
else process.env.PGLITE_DIR = "memory://";
process.env.APP_SECRET = "test-secret-test-secret-test-secret-000";

type Mods = {
  db: typeof import("../src/lib/db");
  booking: typeof import("../src/lib/booking");
  access: typeof import("../src/lib/access");
  providers: typeof import("../src/lib/providers");
  availability: typeof import("../src/lib/availability");
  notify: typeof import("../src/lib/notify");
  tokens: typeof import("../src/lib/tokens");
  seed: typeof import("../src/lib/seed");
};
let m: Mods;
let db: import("../src/lib/db").Db;

beforeAll(async () => {
  m = {
    db: await import("../src/lib/db"),
    booking: await import("../src/lib/booking"),
    access: await import("../src/lib/access"),
    providers: await import("../src/lib/providers"),
    availability: await import("../src/lib/availability"),
    notify: await import("../src/lib/notify"),
    tokens: await import("../src/lib/tokens"),
    seed: await import("../src/lib/seed"),
  };
  if (PG) {
    const admin = await m.db.openDb({ kind: "postgres", url: PG, autoMigrate: false });
    await admin.query("drop schema public cascade; create schema public;");
    await m.db.migrate(admin, { includeDemo: true, includeSupabase: false });
    await m.seed.seedDemo(admin);
    await admin.close();
  }
  db = await m.db.getDb();
});

const settle = () => new Promise((r) => setTimeout(r, 150));
let emailN = 0;
const email = () => `client${++emailN}.test@example.com`;

async function providerAndService(username: string) {
  const p = (await m.providers.providerByUsername(db, username))!;
  const s = (await m.providers.servicesFor(db, p.id))[0];
  return { p, s };
}

/** Free slots at least `minHoursAhead` from now. */
async function freeSlots(username: string, minHoursAhead = 0) {
  const { p, s } = await providerAndService(username);
  const from = new Date(Date.now() + minHoursAhead * 3600_000);
  const slots = await m.availability.availableSlots(db, p, s, { from, to: new Date(from.getTime() + 14 * 86400_000) });
  return { p, s, slots };
}

const input = (username: string, serviceId: string, startsAt: Date, extra: Record<string, unknown> = {}) => ({
  username, serviceId, startsAt: startsAt.toISOString(), name: "Test Client", email: email(), timezone: "Europe/Berlin", ...extra,
});

describe(`double booking prevention (${PG ? "Postgres" : "PGlite"})`, () => {
  it("20 simultaneous requests for one slot produce exactly one booking", async () => {
    const { s, slots } = await freeSlots("marco", 30);
    const slot = slots[0];
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => m.booking.createBooking(input("marco", s.id, slot))));
    const ok = results.filter((r) => r.status === "fulfilled");
    const taken = results.filter((r) => r.status === "rejected" && (r.reason as { code?: string }).code === "slot_taken");
    expect(ok).toHaveLength(1);
    expect(taken).toHaveLength(19);
    const live = await db.query<{ n: number }>(`select count(*)::int as n from appointments where starts_at = $1 and status in ('pending','confirmed')`, [slot]);
    expect(live[0].n).toBe(1);
    await settle();
  });

  it("the database constraint alone rejects overlaps from manual entries and blocks", async () => {
    const { p, slots } = await freeSlots("marco", 30);
    const start = slots[1];
    const end = new Date(start.getTime() + 30 * 60_000);
    const insert = (kind: string) =>
      db.tx((q) => q.query(
        `insert into appointments (provider_id, kind, status, starts_at, ends_at, occupied_until, provider_timezone, title)
         values ($1, 'block', 'confirmed', $2, $3, $3, $4, $5)`,
        [p.id, new Date(start.getTime() + (kind === "b" ? 10 * 60_000 : 0)), end, p.timezone, kind],
      ));
    const r = await Promise.allSettled([insert("a"), insert("b")]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const err = r.find((x) => x.status === "rejected") as PromiseRejectedResult;
    expect(m.db.pgCode(err.reason)).toBe("23P01");
  });

  it("buffers are enforced on the booking that follows", async () => {
    const { p, s, slots } = await freeSlots("marco", 30);
    // Marco has a 5-minute buffer; a slot exactly at the previous end is not offered or accepted.
    const first = slots.find((x, i) => slots[i + 1] && slots[i + 1].getTime() - x.getTime() === 30 * 60_000)!;
    await m.booking.createBooking(input("marco", s.id, first));
    const next = new Date(first.getTime() + 30 * 60_000);
    expect(await m.availability.isSlotAvailable(db, p, s, next)).toBe(false);
    await expect(m.booking.createBooking(input("marco", s.id, next))).rejects.toMatchObject({ code: "slot_taken" });
    await settle();
  });

  it("rejects times outside working hours even if the slot is free", async () => {
    const { s } = await providerAndService("marco");
    const odd = new Date(Date.now() + 3 * 86400_000);
    odd.setUTCHours(7, 13, 0, 0); // 03:13 in New York
    await expect(m.booking.createBooking(input("marco", s.id, odd))).rejects.toMatchObject({ code: "slot_taken" });
  });
});

describe("approval mode", () => {
  it("pending requests hold the slot until they expire, then free it", async () => {
    const { s, slots } = await freeSlots("lena", 6);
    const slot = slots[0];
    const first = await m.booking.createBooking(input("lena", s.id, slot));
    expect(first.status).toBe("pending");
    await expect(m.booking.createBooking(input("lena", s.id, slot))).rejects.toMatchObject({ code: "slot_taken" });
    await db.query(`update appointments set expires_at = now() - interval '1 minute' where id = $1`, [first.appointmentId]);
    const second = await m.booking.createBooking(input("lena", s.id, slot));
    expect(second.status).toBe("pending");
    const [old] = await db.query<{ status: string }>(`select status from appointments where id = $1`, [first.appointmentId]);
    expect(old.status).toBe("expired");
    const notes = await db.query(`select 1 from notifications where dedupe_key = $1`, [`expired:${first.appointmentId}`]);
    expect(notes).toHaveLength(1);
    await settle();
  });

  it("a provider can only approve their own requests", async () => {
    const { s, slots } = await freeSlots("lena", 6);
    const r = await m.booking.createBooking(input("lena", s.id, slots[0]));
    const marco = (await m.providers.providerByUsername(db, "marco"))!;
    const lena = (await m.providers.providerByUsername(db, "lena"))!;
    await expect(m.booking.approveRequest(marco, r.appointmentId)).rejects.toMatchObject({ code: "not_found" });
    await m.booking.approveRequest(lena, r.appointmentId);
    const [a] = await db.query<{ status: string }>(`select status from appointments where id = $1`, [r.appointmentId]);
    expect(a.status).toBe("confirmed");
    await expect(m.booking.approveRequest(lena, r.appointmentId)).rejects.toMatchObject({ code: "expired" });
    await settle();
  });
});

describe("reminders", () => {
  it("are queued 24h ahead, skipped for short-notice bookings, and follow reschedules and cancellations", async () => {
    const { s, slots } = await freeSlots("marco", 48);
    const r = await m.booking.createBooking(input("marco", s.id, slots[0]));
    const reminders = () => db.query<{ status: string; send_after: Date; for_starts_at: Date }>(
      `select status, send_after, for_starts_at from notifications where appointment_id = $1 and kind = 'reminder' order by created_at`, [r.appointmentId]);
    let rows = await reminders();
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].send_after).getTime()).toBe(slots[0].getTime() - 24 * 3600_000);

    await m.booking.rescheduleByClient(r.manageToken, slots[3].toISOString());
    rows = await reminders();
    expect(rows.map((x) => x.status)).toEqual(["cancelled", "queued"]);
    expect(new Date(rows[1].for_starts_at).getTime()).toBe(slots[3].getTime());

    await m.booking.cancelByClient(r.manageToken);
    rows = await reminders();
    expect(rows.every((x) => x.status === "cancelled")).toBe(true);

    const queued = await m.notify.scheduleReminder(db, { providerId: r.appointmentId, appointmentId: r.appointmentId, startsAt: new Date(Date.now() + 5 * 3600_000), to: "x@example.com", subject: "", body: "" });
    expect(queued).toBe(false); // booked < 24h ahead: confirmation only
    await settle();
  });

  it("a due reminder for a cancelled appointment is skipped, and retries never send twice", async () => {
    const { s, slots } = await freeSlots("marco", 48);
    const r = await m.booking.createBooking(input("marco", s.id, slots[5]));
    await settle();
    // Simulate a cancellation that raced the reminder: cancel without touching the outbox.
    await db.query(`update appointments set status = 'cancelled' where id = $1`, [r.appointmentId]);
    await db.query(`update notifications set send_after = now() where appointment_id = $1 and kind = 'reminder'`, [r.appointmentId]);

    // Plus a batch of ordinary due notifications processed by three workers at once.
    const p = (await m.providers.providerByUsername(db, "marco"))!;
    for (let i = 0; i < 12; i++) {
      await m.notify.enqueue(db, { providerId: p.id, kind: "test", to: "x@example.com", subject: `t${i}`, body: "", dedupeKey: `test-${r.appointmentId}-${i}` });
      await m.notify.enqueue(db, { providerId: p.id, kind: "test", to: "x@example.com", subject: `dup${i}`, body: "", dedupeKey: `test-${r.appointmentId}-${i}` });
    }
    const delivered: string[] = [];
    const sender = async (n: { id: string }) => {
      delivered.push(n.id);
      await new Promise((res) => setTimeout(res, 5));
      return "sent" as const;
    };
    await Promise.all([m.notify.processDue(db, { sender }), m.notify.processDue(db, { sender }), m.notify.processDue(db, { sender })]);
    expect(new Set(delivered).size).toBe(delivered.length);
    const rows = await db.query<{ kind: string; status: string }>(`select kind, status from notifications where dedupe_key like $1 or (appointment_id = $2 and kind = 'reminder')`, [`test-${r.appointmentId}-%`, r.appointmentId]);
    expect(rows.filter((x) => x.kind === "test")).toHaveLength(12);
    expect(rows.filter((x) => x.kind === "test").every((x) => x.status === "sent")).toBe(true);
    expect(rows.find((x) => x.kind === "reminder")!.status).toBe("skipped");
  });
});

describe("private access", () => {
  async function grant() {
    const sofia = (await m.providers.providerByUsername(db, "sofia"))!;
    const e = email();
    await m.access.requestAccess({ username: "sofia", name: "Test", email: e });
    const [g] = await db.query<{ id: string }>(`select id from access_grants where email = $1`, [e]);
    const link = await m.access.approveAccess(sofia, g.id);
    return { sofia, id: g.id, token: new URL(link).searchParams.get("k")! };
  }

  it("books only with a valid, approved, unexpired, unrevoked link", async () => {
    const { sofia, id, token } = await grant();
    const s = (await m.providers.servicesFor(db, sofia.id))[0];
    const slots = await m.availability.availableSlots(db, sofia, s, { from: new Date(), to: new Date(Date.now() + 14 * 86400_000) });

    await expect(m.booking.createBooking(input("sofia", s.id, slots[0]))).rejects.toMatchObject({ code: "forbidden" });
    const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    await expect(m.booking.createBooking(input("sofia", s.id, slots[0], { accessToken: tampered }))).rejects.toMatchObject({ code: "forbidden" });
    const wrongPurpose = m.tokens.signToken("manage", id);
    await expect(m.booking.createBooking(input("sofia", s.id, slots[0], { accessToken: wrongPurpose }))).rejects.toMatchObject({ code: "forbidden" });

    const ok = await m.booking.createBooking(input("sofia", s.id, slots[0], { accessToken: token }));
    expect(ok.status).toBe("confirmed");

    await db.query(`update access_grants set expires_at = now() - interval '1 second' where id = $1`, [id]);
    expect(await m.access.verifyAccess(db, sofia, token)).toBeNull();
    await db.query(`update access_grants set expires_at = now() + interval '1 day' where id = $1`, [id]);
    expect(await m.access.verifyAccess(db, sofia, token)).not.toBeNull();
    await m.access.revokeAccess(sofia, id);
    expect(await m.access.verifyAccess(db, sofia, token)).toBeNull();
    await expect(m.booking.createBooking(input("sofia", s.id, slots[2], { accessToken: token }))).rejects.toMatchObject({ code: "forbidden" });
    await settle();
  });

  it("an access link for one provider does not open another", async () => {
    const { token } = await grant();
    const marco = (await m.providers.providerByUsername(db, "marco"))!;
    expect(await m.access.verifyAccess(db, marco, token)).toBeNull();
    await settle();
  });

  it("the slots endpoint returns 403 without a link, and times with one", async () => {
    const { GET } = await import("../src/app/api/slots/route");
    const { sofia, token } = await grant();
    const s = (await m.providers.servicesFor(db, sofia.id))[0];
    const qs = `u=sofia&service=${s.id}&from=${new Date().toISOString()}&to=${new Date(Date.now() + 7 * 86400_000).toISOString()}`;
    const denied = await GET(new Request(`http://t/api/slots?${qs}`));
    expect(denied.status).toBe(403);
    expect(await denied.text()).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    const allowed = await GET(new Request(`http://t/api/slots?${qs}&k=${token}`));
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).slots.length).toBeGreaterThan(0);
    await settle();
  });
});

describe("manage links and usernames", () => {
  it("a manage link only resolves its own appointment, and not after a version bump", async () => {
    const { s, slots } = await freeSlots("marco", 30);
    const r = await m.booking.createBooking(input("marco", s.id, slots[7]));
    expect((await m.booking.appointmentByToken(db, r.manageToken))!.appointment.id).toBe(r.appointmentId);
    expect(await m.booking.appointmentByToken(db, r.manageToken.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).toBeNull();
    await db.query(`update appointments set token_version = token_version + 1 where id = $1`, [r.appointmentId]);
    expect(await m.booking.appointmentByToken(db, r.manageToken)).toBeNull();
    await settle();
  });

  it("usernames are unique case-insensitively, even under concurrent sign-ups", async () => {
    const make = (owner: string, username: string) =>
      db.query(`insert into providers (owner_id, email, username, display_name, timezone) values ($1, 'a@example.com', $2, 'X', 'UTC')`, [owner, username]);
    const r = await Promise.allSettled([make(crypto.randomUUID(), "samename"), make(crypto.randomUUID(), "samename")]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(m.db.pgCode((r.find((x) => x.status === "rejected") as PromiseRejectedResult).reason)).toBe("23505");
    await expect(make(crypto.randomUUID(), "SameName")).rejects.toBeTruthy(); // uppercase never stored
    expect((await m.providers.providerByUsername(db, "SAMENAME"))?.username).toBe("samename");
  });
});

describe("provider search", () => {
  const names = async (q: string) => (await (await import("../src/lib/search")).searchProviders(db, q)).map((r) => r.username);

  it("finds people by name or @username, exact username first", async () => {
    expect(await names("marco")).toEqual(["marco"]);
    expect(await names("Bell")).toEqual(["marco"]);
    expect(await names("@Marco")).toEqual(["marco"]);
    expect(await names("lena okafor")).toEqual(["lena"]);
    const [r] = await (await import("../src/lib/search")).searchProviders(db, "marco");
    expect(r).toEqual({ username: "marco", display_name: "Marco Bellini", profession: "Barber", avatar_url: null, access_mode: "open", exact: true });
  });

  it("keeps invite-only and unlisted people out of name search, but not exact usernames", async () => {
    expect(await names("sofia")).toEqual(["sofia"]); // exact username
    expect(await names("Lindqvist")).toEqual([]); // private: never by name
    await db.query("update providers set listed = false where username = 'lena'");
    try {
      expect(await names("okafor")).toEqual([]);
      expect(await names("@lena")).toEqual(["lena"]);
    } finally {
      await db.query("update providers set listed = true where username = 'lena'");
    }
  });

  it("treats wildcards literally and ignores tiny queries", async () => {
    expect(await names("%%")).toEqual([]);
    expect(await names("_a")).toEqual([]);
    expect(await names("m")).toEqual([]);
    expect(await names("@")).toEqual([]);
  });
});
