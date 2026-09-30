-- DEMO SIGN-IN ONLY. Simulated sign-in for reviewing the app without Supabase Auth.
-- Only applied while sign-in is simulated (no Supabase keys), even if the database is hosted.
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

-- Keep these away from the Supabase Data API if this database is hosted there.
-- The server's own role owns the tables and is unaffected.
alter table demo_users enable row level security;
alter table demo_sessions enable row level security;
