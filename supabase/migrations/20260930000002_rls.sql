-- Row level security for Supabase. The Next.js server talks to Postgres through
-- DATABASE_URL (a privileged role) and enforces ownership in code; these policies are
-- defense in depth for anything that reaches the tables through the Supabase API with
-- the anon or authenticated keys.
--
-- Anonymous users get no direct table access at all: public profiles and slots are
-- served by the app server, which never returns private data.

alter table providers enable row level security;
alter table services enable row level security;
alter table weekly_hours enable row level security;
alter table availability_exceptions enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table access_grants enable row level security;
alter table notifications enable row level security;
alter table rate_limits enable row level security;

create policy providers_owner on providers
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy services_owner on services
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy weekly_hours_owner on weekly_hours
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy availability_exceptions_owner on availability_exceptions
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy clients_owner on clients
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy appointments_owner on appointments
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy access_grants_owner on access_grants
  for all to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

create policy notifications_owner_read on notifications
  for select to authenticated
  using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));

-- rate_limits: no policies, so only the server role can use it.
