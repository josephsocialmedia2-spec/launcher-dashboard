create extension if not exists pgcrypto;

-- CONTATTI CRM
create table if not exists public.contacts (
  id text primary key,
  user_id uuid default auth.uid(),
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
alter table public.contacts add column if not exists user_id uuid default auth.uid();
alter table public.contacts enable row level security;

drop policy if exists "f1 contacts anon read" on public.contacts;
drop policy if exists "f1 contacts anon insert" on public.contacts;
drop policy if exists "f1 contacts anon update" on public.contacts;
drop policy if exists "f1 contacts user read" on public.contacts;
drop policy if exists "f1 contacts user insert" on public.contacts;
drop policy if exists "f1 contacts user update" on public.contacts;
drop policy if exists "f1 contacts user delete" on public.contacts;

create policy "f1 contacts user read" on public.contacts
for select to authenticated using (auth.uid() = user_id);
create policy "f1 contacts user insert" on public.contacts
for insert to authenticated with check (auth.uid() = user_id);
create policy "f1 contacts user update" on public.contacts
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "f1 contacts user delete" on public.contacts
for delete to authenticated using (auth.uid() = user_id);

create index if not exists contacts_updated_at_idx on public.contacts(updated_at desc);
create index if not exists contacts_phone_idx on public.contacts(phone);
create index if not exists contacts_user_idx on public.contacts(user_id);

-- ATTIVITA' SUL TERRITORIO
create table if not exists public.field_visits (
  id text primary key,
  user_id uuid default auth.uid(),
  visit_date date not null,
  comune text not null default '',
  where_text text not null default '',
  action text not null default '',
  occurred_at timestamptz not null default now(),
  device_id text not null default '',
  deleted boolean not null default false
);
alter table public.field_visits enable row level security;

drop policy if exists "f1 visits user read" on public.field_visits;
drop policy if exists "f1 visits user insert" on public.field_visits;
drop policy if exists "f1 visits user update" on public.field_visits;
drop policy if exists "f1 visits user delete" on public.field_visits;
create policy "f1 visits user read" on public.field_visits
for select to authenticated using (auth.uid() = user_id);
create policy "f1 visits user insert" on public.field_visits
for insert to authenticated with check (auth.uid() = user_id);
create policy "f1 visits user update" on public.field_visits
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "f1 visits user delete" on public.field_visits
for delete to authenticated using (auth.uid() = user_id);
create index if not exists field_visits_user_date_idx on public.field_visits(user_id,visit_date desc);
