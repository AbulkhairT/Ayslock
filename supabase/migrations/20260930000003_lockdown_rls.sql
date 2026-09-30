-- Supabase only. The migration log lives in the public schema too; with RLS on and no
-- policies, the Supabase Data API (anon and authenticated keys) can't read or change it.
-- Only the server's database role can.
alter table if exists schema_migrations enable row level security;

-- Simulated demo sign-in tables, in case this database was used in demo mode first.
alter table if exists demo_users enable row level security;
alter table if exists demo_sessions enable row level security;
