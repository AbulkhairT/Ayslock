-- demo: profiles created with simulated sign-in (demo mode). They stay in the database but are
-- only shown while demo mode is on, so a production site never lists them.
alter table providers add column if not exists demo boolean not null default false;
do $$
begin
  if to_regclass('public.demo_users') is not null then
    update providers p set demo = true where exists (select 1 from demo_users d where d.id = p.owner_id);
  end if;
end $$;

-- bookings_seen_at: when the provider last dismissed "new bookings" on their schedule.
alter table providers add column if not exists bookings_seen_at timestamptz not null default now();
