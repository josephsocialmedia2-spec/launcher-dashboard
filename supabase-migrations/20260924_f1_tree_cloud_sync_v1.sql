-- F1 Albero Fonti di Notizie: Supabase source of truth.
-- Applied to project nqnmlsmeiynxbdojeyjt on 2026-09-24.

alter table public.network_contacts
  add column if not exists app_scope text not null default '',
  add column if not exists legacy_id text,
  add column if not exists parent_contact_id uuid,
  add column if not exists tree_source text not null default '',
  add column if not exists data_primo_contatto date,
  add column if not exists data_prossimo_contatto date,
  add column if not exists centro_influenza boolean not null default false,
  add column if not exists contact_dates jsonb not null default '[]'::jsonb,
  add column if not exists tree_meta jsonb not null default '{}'::jsonb;

create unique index if not exists network_contacts_tree_legacy_uidx
  on public.network_contacts(user_id, app_scope, legacy_id);
create index if not exists network_contacts_tree_parent_idx
  on public.network_contacts(parent_contact_id);
create index if not exists network_contacts_tree_scope_idx
  on public.network_contacts(user_id, app_scope, updated_at desc);

create table if not exists public.f1_network_life_triggers (
  trigger_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references public.network_contacts(contact_id) on delete cascade,
  trigger_type text not null,
  trigger_label text not null default '',
  data_rilevazione timestamptz not null default now(),
  note text not null default '',
  status text not null default 'RILEVATO',
  active boolean not null default true,
  history jsonb not null default '[]'::jsonb,
  news_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists f1_network_life_triggers_unique
  on public.f1_network_life_triggers(user_id, contact_id, trigger_type);

create table if not exists public.f1_network_touchpoints (
  touchpoint_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references public.network_contacts(contact_id) on delete cascade,
  touchpoint_key text not null,
  cycle_year integer not null,
  numero_touchpoint smallint not null,
  data_prevista date not null,
  data_effettiva timestamptz,
  titolo text not null default '',
  categoria text not null default '',
  contenuto text not null default '',
  fonte text not null default '',
  url_fonte text not null default '',
  stato text not null default 'DA_FARE',
  canale text not null default '',
  pdf_url text not null default '',
  social_searches jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists f1_network_touchpoints_unique
  on public.f1_network_touchpoints(user_id, contact_id, touchpoint_key);

create table if not exists public.f1_network_social_searches (
  search_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references public.network_contacts(contact_id) on delete cascade,
  touchpoint_key text not null default '',
  platform text not null,
  query text not null default '',
  data_ricerca timestamptz not null default now(),
  eseguita_da uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists f1_network_social_searches_unique
  on public.f1_network_social_searches(user_id, contact_id, touchpoint_key, platform);

create table if not exists public.f1_tree_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  daily_target integer not null default 40,
  automation_webhook text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.f1_real_estate_news
  add column if not exists network_contact_id uuid,
  add column if not exists origin_trigger_id uuid,
  add column if not exists tree_status text not null default 'POSSIBILE';

alter table public.f1_network_life_triggers enable row level security;
alter table public.f1_network_touchpoints enable row level security;
alter table public.f1_network_social_searches enable row level security;
alter table public.f1_tree_settings enable row level security;

grant select, insert, update, delete on public.f1_network_life_triggers to authenticated;
grant select, insert, update, delete on public.f1_network_touchpoints to authenticated;
grant select, insert, update, delete on public.f1_network_social_searches to authenticated;
grant select, insert, update, delete on public.f1_tree_settings to authenticated;

-- Production also has per-user RLS policies (auth.uid() = user_id/owner_id),
-- parent/child cascade constraints, updated_at triggers and news foreign keys.
-- Those were applied in the Supabase migration f1_tree_cloud_sync_v1.
