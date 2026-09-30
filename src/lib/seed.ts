import crypto from "node:crypto";
import { DateTime } from "luxon";
import type { Queryable } from "./db";
import { hashPassword } from "./password";

// Fictional demo providers for LOCAL DEMO MODE. All names, addresses and emails are made up.
export const DEMO_PASSWORD = "ayslock-demo";

interface DemoProvider {
  email: string;
  username: string;
  display_name: string;
  bio: string;
  timezone: string;
  location_kind: "in_person" | "online";
  location_text: string;
  access_mode: "open" | "approval" | "private";
  buffer_minutes: number;
  min_notice_minutes: number;
  services: { name: string; description: string; duration: number; price: number | null }[];
  days: number[]; // ISO weekdays
  hours: [number, number][]; // local minutes, gaps are breaks
}

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    email: "marco@example.com",
    username: "marco",
    display_name: "Marco Bellini",
    bio: "Classic cuts, skin fades and hot-towel shaves. Twelve years behind the chair.",
    timezone: "America/New_York",
    location_kind: "in_person",
    location_text: "Bellini Barbers, 48 Orchard Lane, Brooklyn, NY",
    access_mode: "open",
    buffer_minutes: 5,
    min_notice_minutes: 60,
    services: [
      { name: "Haircut", description: "Wash, cut and style.", duration: 30, price: 3500 },
      { name: "Beard trim", description: "Shape-up with a hot towel.", duration: 20, price: 2000 },
      { name: "Cut and beard", description: "The full refresh.", duration: 45, price: 5000 },
    ],
    days: [2, 3, 4, 5, 6],
    hours: [[600, 840], [870, 1140]],
  },
  {
    email: "lena@example.com",
    username: "lena",
    display_name: "Lena Okafor",
    bio: "Licensed massage therapist focused on recovery, desk-worker tension and sports massage.",
    timezone: "America/Chicago",
    location_kind: "in_person",
    location_text: "Northside Wellness Studio, Suite 3, Chicago, IL",
    access_mode: "approval",
    buffer_minutes: 15,
    min_notice_minutes: 240,
    services: [
      { name: "Deep tissue massage", description: "Firm pressure for stubborn knots.", duration: 60, price: 9500 },
      { name: "Swedish massage", description: "Relaxing full-body massage.", duration: 90, price: 13000 },
    ],
    days: [1, 2, 3, 4, 5],
    hours: [[600, 780], [840, 1140]],
  },
  {
    email: "sofia@example.com",
    username: "sofia",
    display_name: "Sofia Lindqvist",
    bio: "Maths and physics tutor for GCSE, A-level and first-year university. Patient, practical, exam-focused.",
    timezone: "Europe/London",
    location_kind: "online",
    location_text: "Video call. The link is in your confirmation.",
    access_mode: "private",
    buffer_minutes: 10,
    min_notice_minutes: 720,
    services: [
      { name: "Tutoring session", description: "One-to-one lesson on any topic.", duration: 60, price: 4500 },
      { name: "Exam prep", description: "Past papers and technique.", duration: 90, price: 6500 },
    ],
    days: [1, 2, 3, 4, 6],
    hours: [[540, 720], [780, 1080]],
  },
];

/**
 * Fixed ids for demo records, so separate server instances that each seed their own
 * temporary copy (serverless hosts with no shared database) still agree on them.
 */
function stableId(key: string) {
  const h = crypto.createHash("sha256").update(`ayslock-demo:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function nextDay(zone: string, days: number[], afterDays: number, minute: number) {
  let d = DateTime.now().setZone(zone).startOf("day").plus({ days: afterDays });
  while (!days.includes(d.weekday)) d = d.plus({ days: 1 });
  return d.plus({ minutes: minute });
}

/** Seeds the demo profiles once. Pass a transaction so it's all-or-nothing. */
export async function seedDemo(q: Queryable) {
  const existing = await q.query<{ n: number }>(`select count(*)::int as n from providers`);
  if (existing[0].n > 0) return false;
  for (const p of DEMO_PROVIDERS) await seedProvider(q, p);
  return true;
}

async function seedProvider(q: Queryable, p: DemoProvider) {
  const [user] = await q.query<{ id: string }>(
    `insert into demo_users (id, email, password_hash) values ($1, $2, $3)
     on conflict (email) do update set email = excluded.email returning id`,
    [stableId(`user:${p.username}`), p.email, hashPassword(DEMO_PASSWORD)],
  );
  const [prov] = await q.query<{ id: string }>(
    `insert into providers (id, owner_id, email, username, display_name, bio, timezone, location_kind, location_text, access_mode, buffer_minutes, min_notice_minutes)
     values ($12, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
    [user.id, p.email, p.username, p.display_name, p.bio, p.timezone, p.location_kind, p.location_text, p.access_mode, p.buffer_minutes, p.min_notice_minutes, stableId(`provider:${p.username}`)],
  );
  const serviceIds: string[] = [];
  for (const [i, s] of p.services.entries()) {
    const [row] = await q.query<{ id: string }>(
      `insert into services (id, provider_id, name, description, duration_minutes, price_cents, currency, position) values ($8, $1, $2, $3, $4, $5, $6, $7) returning id`,
      [prov.id, s.name, s.description, s.duration, s.price, p.timezone.startsWith("Europe/London") ? "GBP" : "USD", i, stableId(`service:${p.username}:${i}`)],
    );
    serviceIds.push(row.id);
  }
  for (const d of p.days) for (const [s, e] of p.hours) {
    await q.query(`insert into weekly_hours (provider_id, weekday, start_minute, end_minute) values ($1, $2, $3, $4)`, [prov.id, d, s, e]);
  }

  const clients = [
    { name: "Priya Shah", email: "priya.demo@example.com", note: "Prefers a quiet session." },
    { name: "Tom Becker", email: "tom.demo@example.com", note: "Regular. Usually books every 3 weeks." },
    { name: "Ana Ruiz", email: "ana.demo@example.com", note: "" },
  ];
  const clientIds: string[] = [];
  for (const c of clients) {
    const [row] = await q.query<{ id: string }>(`insert into clients (provider_id, name, email, notes) values ($1, $2, $3, $4) returning id`, [prov.id, c.name, c.email, c.note]);
    clientIds.push(row.id);
  }

  const svc = p.services[0];
  const add = async (start: DateTime, clientIdx: number, status: "confirmed" | "pending" | "cancelled") => {
    const s = start.toJSDate();
    const e = start.plus({ minutes: svc.duration }).toJSDate();
    const occ = start.plus({ minutes: svc.duration + p.buffer_minutes }).toJSDate();
    await q.query(
      `insert into appointments (provider_id, kind, status, service_id, client_id, service_name, starts_at, ends_at, occupied_until, provider_timezone, client_timezone, source, expires_at)
       values ($1, 'booking', $2, $3, $4, $5, $6, $7, $8, $9, $9, 'client', $10)`,
      [prov.id, status, serviceIds[0], clientIds[clientIdx], svc.name, s, e, occ, p.timezone, status === "pending" ? new Date(Date.now() + 20 * 3600_000) : null],
    );
  };
  // A past visit, two upcoming confirmed appointments and (for approval mode) a pending request.
  await add(nextDay(p.timezone, p.days, -14, p.hours[0][0] + 60), 1, "confirmed");
  await add(nextDay(p.timezone, p.days, 1, p.hours[0][0]), 0, "confirmed");
  await add(nextDay(p.timezone, p.days, 1, p.hours[1][0] + 60), 1, "confirmed");
  if (p.access_mode === "approval") await add(nextDay(p.timezone, p.days, 2, p.hours[0][0] + 60), 2, "pending");
  if (p.access_mode === "private") {
    await q.query(`insert into access_grants (provider_id, name, email, message) values ($1, $2, $3, $4)`, [prov.id, "Ana Ruiz", "ana.demo@example.com", "My daughter needs help with A-level mechanics."]);
  }
}
