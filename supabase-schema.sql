create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id text primary key,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  source text not null default '',
  note text not null default '',
  outcome text not null default 'Da richiamare',
  next_action text not null default '',
  followup_date date,
  updated_at timestamptz not null default now(),
  device_id text not null default '',
  deleted boolean not null default false
);

alter table public.contacts enable row level security;

-- Prima versione operativa: accesso tramite anon key dell'app.
-- Per maggiore sicurezza multi-utente, sostituire questa policy con autenticazione Supabase Auth.
drop policy if exists "f1 contacts anon read" on public.contacts;
drop policy if exists "f1 contacts anon insert" on public.contacts;
drop policy if exists "f1 contacts anon update" on public.contacts;

create policy "f1 contacts anon read" on public.contacts
for select to anon using (true);

create policy "f1 contacts anon insert" on public.contacts
for insert to anon with check (true);

create policy "f1 contacts anon update" on public.contacts
for update to anon using (true) with check (true);

create index if not exists contacts_updated_at_idx on public.contacts(updated_at desc);
create index if not exists contacts_phone_idx on public.contacts(phone);
