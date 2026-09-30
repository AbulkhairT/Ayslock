-- LOCAL DEMO MODE ONLY. Simulated sign-in for reviewing the app without Supabase.
-- Never applied to a Supabase project.
create table if not exists demo_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists demo_sessions (
  token_hash text primary key,
  user_id uuid not null references demo_users(id) on delete cascade,
  expires_at timestamptz not null
);
