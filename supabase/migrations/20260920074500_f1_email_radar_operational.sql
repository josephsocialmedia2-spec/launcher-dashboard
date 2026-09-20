-- F1 Email Radar operational layer — repository snapshot
-- Live changes were applied and verified on Supabase on 2026-09-20.
alter table public.f1_email_radar_runs add column if not exists checkpoint jsonb not null default '{}'::jsonb;
alter table public.f1_email_radar_runs add column if not exists requested_action text not null default '';
alter table public.f1_email_radar_runs add column if not exists retry_count integer not null default 0;
alter table public.f1_email_radar_runs add column if not exists ateco_coverage numeric(5,2) not null default 0;

create table if not exists public.f1_email_radar_providers(
 provider_key text primary key,label text not null,provider_type text not null,mode text not null,
 base_url text not null default '',secret_names text[] not null default '{}',enabled boolean not null default true,
 credential_status text not null default 'NOT_REQUIRED',runtime_status text not null default 'READY',
 notes text not null default '',updated_at timestamptz not null default now()
);
alter table public.f1_email_radar_providers enable row level security;

create table if not exists public.f1_email_radar_entity_history(
 history_id bigint generated always as identity primary key,
 entity_id uuid not null references public.f1_email_radar_entities(entity_id) on delete cascade,
 changed_at timestamptz not null default now(),changed_by uuid,before_data jsonb not null,after_data jsonb not null
);
alter table public.f1_email_radar_entity_history enable row level security;

create table if not exists public.f1_email_radar_runtime_config(
 key text primary key,value text not null,updated_at timestamptz not null default now()
);
alter table public.f1_email_radar_runtime_config enable row level security;
revoke all on public.f1_email_radar_runtime_config from anon,authenticated;

-- Il token Cron NON è nel repository. Generarlo nel DB e conservarlo in Supabase Vault.
-- Le credenziali provider vanno configurate come Edge Function Secrets.


-- Explicit client deny policy: runtime config is service-role only.
drop policy if exists "email radar runtime deny client" on public.f1_email_radar_runtime_config;
create policy "email radar runtime deny client"
on public.f1_email_radar_runtime_config
for all to authenticated
using (false)
with check (false);

create or replace function public.f1_email_radar_ateco_leaf_count()
returns integer
language sql
stable
security invoker
set search_path=public,pg_temp
as $$ select count(*)::integer from public.f1_ateco_2025 where level=6 $$;
grant execute on function public.f1_email_radar_ateco_leaf_count() to authenticated,service_role;


create table if not exists public.f1_email_radar_municipality_queue(
 queue_id uuid primary key default gen_random_uuid(),
 comune text not null unique,
 lato text not null,
 sort_order integer not null,
 status text not null default 'WAITING_PILOT',
 last_run_id uuid references public.f1_email_radar_runs(run_id) on delete set null,
 last_run_at timestamptz,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.f1_email_radar_municipality_queue enable row level security;
revoke all on public.f1_email_radar_municipality_queue from anon;
grant select on public.f1_email_radar_municipality_queue to authenticated;

drop policy if exists "email radar queue staff read" on public.f1_email_radar_municipality_queue;
create policy "email radar queue staff read" on public.f1_email_radar_municipality_queue
for select to authenticated
using (exists(select 1 from public.f1_staff_profiles p where p.user_id=(select auth.uid()) and p.status='ACTIVE'));

-- La queue viene popolata dalla configurazione territoriale attiva.
-- Avigliana resta PILOT; gli altri Comuni restano WAITING_PILOT fino al completamento reale del pilot.
