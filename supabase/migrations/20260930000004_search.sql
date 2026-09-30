-- Name search on the home page.
-- profession: a short public line under the name ("Barber", "Maths tutor").
-- listed: whether the provider shows up when clients search by name. An exact @username
-- always finds them; invite-only (private) providers never appear in name search.
alter table providers add column if not exists profession text not null default '' check (char_length(profession) <= 60);
alter table providers add column if not exists listed boolean not null default true;
create index if not exists providers_display_name_lower_idx on providers (lower(display_name));
