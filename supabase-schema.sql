create extension if not exists pgcrypto;

-- ============================================================================
-- LEGACY COMPATIBILITY: CONTATTI CRM
-- ============================================================================
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

-- ============================================================================
-- LEGACY COMPATIBILITY: ATTIVITA' SUL TERRITORIO
-- ============================================================================
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

-- ============================================================================
-- F1 ACQUISITION ENGINE — 5 PILLARS
-- Supabase = source of truth. Public GitHub JSON must never contain unnecessary PII.
-- ============================================================================

create table if not exists public.leads (
  lead_id text primary key,
  user_id uuid not null default auth.uid(),
  pillar smallint not null check (pillar between 1 and 5),
  source_type text not null default '',
  source text not null default '',
  source_url text not null default '',
  created_at timestamptz not null default now(),
  first_seen timestamptz,
  last_seen timestamptz,
  nome text not null default '',
  cognome text not null default '',
  azienda text not null default '',
  telefono text not null default '',
  email text not null default '',
  comune text not null default '',
  via text not null default '',
  civico text not null default '',
  zona text not null default '',
  immobile_id text not null default '',
  competitor_agency text not null default '',
  lead_reason text not null default '',
  lead_score smallint not null default 0 check (lead_score between 0 and 100),
  confidence text not null default 'LOW',
  status text not null default 'DA_ANALIZZARE',
  last_contact timestamptz,
  next_action text not null default '',
  next_action_date timestamptz,
  assigned_to text not null default '',
  notes text not null default '',
  privacy_basis text not null default '',
  do_not_contact boolean not null default false,
  rpo_status text not null default 'DA_VERIFICARE',
  created_by text not null default '',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.properties (
  property_id text primary key,
  user_id uuid not null default auth.uid(),
  comune text not null default '',
  via text not null default '',
  civico text not null default '',
  zona text not null default '',
  frazione text not null default '',
  latitude double precision,
  longitude double precision,
  tipologia text not null default '',
  caratteristiche jsonb not null default '{}'::jsonb,
  first_seen timestamptz,
  last_seen timestamptz,
  status text not null default 'OSSERVATO',
  fingerprint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.sources (
  source_id text primary key,
  user_id uuid not null default auth.uid(),
  source_type text not null default '',
  name text not null default '',
  base_url text not null default '',
  is_public boolean not null default true,
  requires_manual_access boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agencies (
  agency_id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null default '',
  comune text not null default '',
  sedi jsonb not null default '[]'::jsonb,
  sito text not null default '',
  telefono_pubblico text not null default '',
  portali jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  first_seen timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_observations (
  observation_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property_id text not null,
  observed_at timestamptz not null default now(),
  source_id text not null default '',
  source_url text not null default '',
  portal text not null default '',
  agency_id text not null default '',
  listing_status text not null default 'ONLINE',
  asking_price numeric,
  surface_mq numeric,
  fingerprint text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'MEDIUM',
  created_at timestamptz not null default now()
);

create table if not exists public.property_agency_history (
  history_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property_id text not null,
  agency_id text not null,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  listing_url text not null default '',
  asking_price_start numeric,
  asking_price_end numeric,
  observed_days integer not null default 0,
  exit_reason text not null default '',
  confidence text not null default 'MEDIUM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  event_type text not null,
  pillar smallint check (pillar between 1 and 5),
  lead_id text not null default '',
  property_id text not null default '',
  source_id text not null default '',
  evidence_url text not null default '',
  evidence_type text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'MEDIUM',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  task_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lead_id text not null default '',
  property_id text not null default '',
  event_id uuid,
  pillar smallint not null check (pillar between 1 and 5),
  task_type text not null,
  reason text not null default '',
  priority smallint not null default 0 check (priority between 0 and 100),
  due_date timestamptz,
  assigned_to text not null default '',
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  outcome text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.interactions (
  interaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lead_id text not null default '',
  property_id text not null default '',
  task_id uuid,
  interaction_type text not null,
  direction text not null default 'OUTBOUND',
  occurred_at timestamptz not null default now(),
  outcome text not null default '',
  note text not null default '',
  next_action text not null default '',
  next_action_date timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  referral_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lead_id text not null default '',
  referral_type text not null default '',
  source_contact text not null default '',
  destination_contact text not null default '',
  source text not null default '',
  status text not null default 'OPEN',
  received_at timestamptz not null default now(),
  outcome text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  campaign_type text not null,
  property_id text not null default '',
  territory_key text not null default '',
  name text not null default '',
  status text not null default 'PLANNED',
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.territories (
  territory_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  config_version integer not null,
  reference_hub text not null,
  policy text not null,
  config jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.social_signals (
  social_signal_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  platform text not null,
  source_url text not null,
  author_public text not null default '',
  comune text not null default '',
  zona text not null default '',
  published_at timestamptz,
  signal_text text not null default '',
  category text not null default '',
  confidence text not null default 'LOW',
  status text not null default 'DA_VERIFICARE',
  next_action text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- RLS
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'leads','properties','sources','agencies','property_observations',
    'property_agency_history','events','tasks','interactions','referrals',
    'campaigns','territories','social_signals'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "f1 %s user read" on public.%I', t, t);
    execute format('drop policy if exists "f1 %s user insert" on public.%I', t, t);
    execute format('drop policy if exists "f1 %s user update" on public.%I', t, t);
    execute format('drop policy if exists "f1 %s user delete" on public.%I', t, t);
    execute format('create policy "f1 %s user read" on public.%I for select to authenticated using (auth.uid() = user_id)', t, t);
    execute format('create policy "f1 %s user insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t, t);
    execute format('create policy "f1 %s user update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy "f1 %s user delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists leads_user_status_idx on public.leads(user_id,status,next_action_date);
create index if not exists leads_user_pillar_idx on public.leads(user_id,pillar,lead_score desc);
create index if not exists leads_location_idx on public.leads(user_id,comune,via);
create index if not exists properties_location_idx on public.properties(user_id,comune,via,civico);
create index if not exists properties_last_seen_idx on public.properties(user_id,last_seen desc);
create index if not exists property_obs_property_idx on public.property_observations(user_id,property_id,observed_at desc);
create index if not exists property_obs_source_idx on public.property_observations(user_id,source_url);
create index if not exists property_agency_property_idx on public.property_agency_history(user_id,property_id,first_seen,last_seen);
create index if not exists events_type_time_idx on public.events(user_id,event_type,occurred_at desc);
create index if not exists events_property_idx on public.events(user_id,property_id,occurred_at desc);
create index if not exists tasks_due_idx on public.tasks(user_id,status,due_date,priority desc);
create index if not exists tasks_type_idx on public.tasks(user_id,task_type,status,priority desc);
create index if not exists interactions_lead_idx on public.interactions(user_id,lead_id,occurred_at desc);
create index if not exists campaigns_type_status_idx on public.campaigns(user_id,campaign_type,status);
create index if not exists social_signals_status_idx on public.social_signals(user_id,status,created_at desc);
