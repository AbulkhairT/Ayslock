-- Language for emails. Providers get emails in the language they use the site in;
-- clients in the language they booked or asked for access in.
alter table providers add column if not exists locale text not null default 'en' check (locale in ('en', 'ru'));
alter table clients add column if not exists locale text not null default 'en' check (locale in ('en', 'ru'));
alter table access_grants add column if not exists locale text not null default 'en' check (locale in ('en', 'ru'));
