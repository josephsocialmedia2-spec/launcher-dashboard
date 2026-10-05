-- F1 Agency 360 — valuations, property documents and listing distribution
-- Applied to production on 2026-10-05.

create table if not exists public.f1_property_valuations (
  valuation_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  property_id text not null references public.properties(property_id) on delete cascade,
  valuation_date date not null default current_date,
  source text not null default 'MANUAL',
  omi_zone text not null default '',
  omi_semester text not null default '',
  omi_min numeric,
  omi_max numeric,
  surface_mq numeric,
  correction_pct numeric not null default 0 check (correction_pct between -50 and 50),
  declared_comps jsonb not null default '[]'::jsonb,
  market_comps jsonb not null default '[]'::jsonb,
  estimated_low numeric,
  estimated_high numeric,
  recommended_list_price numeric,
  notes text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEWED','APPROVED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_f1_property_valuations_property on public.f1_property_valuations(property_id, valuation_date desc);
alter table public.f1_property_valuations enable row level security;
revoke all on public.f1_property_valuations from anon;
grant select,insert,update,delete on public.f1_property_valuations to authenticated;

create policy "f1 valuations select" on public.f1_property_valuations for select to authenticated
using ((select f1_private.can_access_user(user_id)));
create policy "f1 valuations insert" on public.f1_property_valuations for insert to authenticated
with check ((select f1_private.can_access_user(user_id)));
create policy "f1 valuations update" on public.f1_property_valuations for update to authenticated
using ((select f1_private.can_access_user(user_id))) with check ((select f1_private.can_access_user(user_id)));
create policy "f1 valuations delete" on public.f1_property_valuations for delete to authenticated
using ((select f1_private.is_titolare()));

create table if not exists public.f1_property_documents (
  document_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  property_id text not null references public.properties(property_id) on delete cascade,
  document_type text not null,
  status text not null default 'MISSING' check (status in ('MISSING','REQUESTED','RECEIVED','VERIFIED','EXPIRED','NOT_APPLICABLE')),
  file_name text not null default '',
  file_url text not null default '',
  issued_at date,
  expires_at date,
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_f1_property_documents_property on public.f1_property_documents(property_id, document_type);
alter table public.f1_property_documents enable row level security;
revoke all on public.f1_property_documents from anon;
grant select,insert,update,delete on public.f1_property_documents to authenticated;

create policy "f1 documents select" on public.f1_property_documents for select to authenticated
using ((select f1_private.can_access_user(user_id)));
create policy "f1 documents insert" on public.f1_property_documents for insert to authenticated
with check ((select f1_private.can_access_user(user_id)));
create policy "f1 documents update" on public.f1_property_documents for update to authenticated
using ((select f1_private.can_access_user(user_id))) with check ((select f1_private.can_access_user(user_id)));
create policy "f1 documents delete" on public.f1_property_documents for delete to authenticated
using ((select f1_private.is_titolare()));

create table if not exists public.f1_listing_distribution (
  distribution_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  property_id text not null references public.properties(property_id) on delete cascade,
  channel text not null,
  status text not null default 'NOT_READY' check (status in ('NOT_READY','READY','QUEUED','PUBLISHED','PAUSED','ERROR','REMOVED')),
  external_id text not null default '',
  external_url text not null default '',
  last_sync_at timestamptz,
  last_error text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, channel)
);
create index if not exists idx_f1_listing_distribution_property on public.f1_listing_distribution(property_id,status);
alter table public.f1_listing_distribution enable row level security;
revoke all on public.f1_listing_distribution from anon;
grant select,insert,update,delete on public.f1_listing_distribution to authenticated;

create policy "f1 distribution select" on public.f1_listing_distribution for select to authenticated
using ((select f1_private.can_access_user(user_id)));
create policy "f1 distribution insert" on public.f1_listing_distribution for insert to authenticated
with check ((select f1_private.can_access_user(user_id)));
create policy "f1 distribution update" on public.f1_listing_distribution for update to authenticated
using ((select f1_private.can_access_user(user_id))) with check ((select f1_private.can_access_user(user_id)));
create policy "f1 distribution delete" on public.f1_listing_distribution for delete to authenticated
using ((select f1_private.is_titolare()));
