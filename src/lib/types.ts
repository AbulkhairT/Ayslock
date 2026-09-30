export type AccessMode = "open" | "approval" | "private";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "declined" | "expired";

export interface Provider {
  id: string;
  owner_id: string;
  email: string;
  username: string;
  display_name: string;
  profession: string;
  listed: boolean;
  /** Language of the provider's emails. */
  locale: "en" | "ru";
  bio: string;
  avatar_url: string | null;
  timezone: string;
  location_kind: "in_person" | "online";
  location_text: string;
  access_mode: AccessMode;
  min_notice_minutes: number;
  horizon_days: number;
  buffer_minutes: number;
  pending_expiry_hours: number;
  access_link_days: number;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number | null;
  currency: string;
  active: boolean;
  position: number;
}

export interface Appointment {
  id: string;
  provider_id: string;
  kind: "booking" | "block";
  status: AppointmentStatus;
  service_id: string | null;
  client_id: string | null;
  service_name: string | null;
  starts_at: Date;
  ends_at: Date;
  occupied_until: Date;
  provider_timezone: string;
  client_timezone: string | null;
  client_note: string | null;
  title: string | null;
  source: "client" | "provider";
  expires_at: Date | null;
  token_version: number;
  cancelled_by: string | null;
  created_at: Date;
}

/** Public, safe-to-send provider fields. */
export interface PublicProvider {
  username: string;
  display_name: string;
  profession: string;
  bio: string;
  avatar_url: string | null;
  timezone: string;
  location_kind: "in_person" | "online";
  location_text: string;
  access_mode: AccessMode;
}

export function toPublicProvider(p: Provider): PublicProvider {
  return {
    username: p.username,
    display_name: p.display_name,
    profession: p.profession,
    bio: p.bio,
    avatar_url: p.avatar_url,
    timezone: p.timezone,
    location_kind: p.location_kind,
    location_text: p.location_text,
    access_mode: p.access_mode,
  };
}

export const PROVIDER_COLS = `id, owner_id, email, username, display_name, profession, listed, locale, bio, avatar_url, timezone, location_kind,
  location_text, access_mode, min_notice_minutes, horizon_days, buffer_minutes, pending_expiry_hours, access_link_days`;

export const APPT_COLS = `id, provider_id, kind, status, service_id, client_id, service_name, starts_at, ends_at,
  occupied_until, provider_timezone, client_timezone, client_note, title, source, expires_at, token_version,
  cancelled_by, created_at`;
