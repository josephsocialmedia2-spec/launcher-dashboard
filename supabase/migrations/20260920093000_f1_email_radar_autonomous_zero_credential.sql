-- F1 Email Radar autonomous zero-credential core
-- Applied live on 2026-09-20.

alter table public.f1_email_radar_runs
  drop constraint if exists f1_email_radar_runs_status_check;
alter table public.f1_email_radar_runs
  add constraint f1_email_radar_runs_status_check
  check (status in ('QUEUED','RUNNING','PAUSED','COMPLETED','INCOMPLETE','FAILED','STOPPED'));

alter table public.f1_email_radar_runs
  add column if not exists discovery_completeness numeric(5,2) not null default 0,
  add column if not exists ateco_coverage_basis text not null default 'DIVISIONI_ATECO_2025';

alter table public.f1_email_radar_source_progress
  add column if not exists sort_order integer not null default 100,
  add column if not exists provider_class text not null default 'OPTIONAL_NOT_CONFIGURED',
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_failure_at timestamptz,
  add column if not exists next_retry_at timestamptz;

alter table public.f1_email_radar_providers
  add column if not exists completion_class text not null default 'OPTIONAL_NOT_CONFIGURED',
  add column if not exists circuit_state text not null default 'CLOSED',
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_failure_at timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_success_at timestamptz;

alter table public.f1_email_radar_entities
  add column if not exists ateco_status text not null default 'UNKNOWN',
  add column if not exists geocoder text not null default '',
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_precision text not null default '',
  add column if not exists source_uid text not null default '',
  add column if not exists field_provenance jsonb not null default '{}'::jsonb;

create unique index if not exists f1_email_radar_entity_source_uid_uniq
on public.f1_email_radar_entities(primary_source_type,source_uid)
where source_uid<>'';

create table if not exists public.f1_email_radar_local_sources(
  local_source_id uuid primary key default gen_random_uuid(),
  comune text not null,
  source_type text not null,
  url text not null,
  provider_key text not null default 'FONTI_LOCALI',
  status text not null default 'DISCOVERED',
  parser_type text not null default 'PUBLIC_WEB',
  confidence smallint not null default 60 check(confidence between 0 and 100),
  license text not null default '',
  discovered_at timestamptz not null default now(),
  last_checked timestamptz,
  failure_count integer not null default 0,
  last_error text not null default '',
  next_retry_at timestamptz,
  unique(comune,url)
);
alter table public.f1_email_radar_local_sources enable row level security;
revoke all on public.f1_email_radar_local_sources from anon,authenticated;
grant select on public.f1_email_radar_local_sources to authenticated;
drop policy if exists "email radar local sources staff read" on public.f1_email_radar_local_sources;
create policy "email radar local sources staff read"
on public.f1_email_radar_local_sources for select to authenticated
using (exists(select 1 from public.f1_staff_profiles p where p.user_id=(select auth.uid()) and p.status='ACTIVE'));

create table if not exists public.f1_email_radar_ateco_progress(
  progress_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.f1_email_radar_runs(run_id) on delete cascade,
  division_code text not null,
  division_title text not null default '',
  status text not null default 'ANALYZED_NO_RESULTS',
  entities_count integer not null default 0,
  analyzed_at timestamptz not null default now(),
  unique(run_id,division_code)
);
alter table public.f1_email_radar_ateco_progress enable row level security;
revoke all on public.f1_email_radar_ateco_progress from anon,authenticated;
grant select on public.f1_email_radar_ateco_progress to authenticated;
drop policy if exists "email radar ateco progress staff read" on public.f1_email_radar_ateco_progress;
create policy "email radar ateco progress staff read"
on public.f1_email_radar_ateco_progress for select to authenticated
using (exists(select 1 from public.f1_staff_profiles p where p.user_id=(select auth.uid()) and p.status='ACTIVE'));

insert into public.f1_email_radar_providers(
  provider_key,label,provider_type,mode,base_url,secret_names,enabled,credential_status,runtime_status,notes,completion_class
) values
('OSM_DIRECTORY','OpenStreetMap / Overpass','business_directory','PUBLIC_API_ZERO_CREDENTIAL','https://overpass-api.de/api/interpreter','{}',true,'NOT_REQUIRED','READY_ZERO_CREDENTIAL',
 'Discovery POI/business con query seriali, caching e backoff. Salva attribution ODbL; non usa dati contributor.', 'REQUIRED_AUTOMATABLE'),
('ATECO_ANALYSIS','Analisi copertura ATECO','internal_classifier','INTERNAL','', '{}',true,'NOT_REQUIRED','READY',
 'Analizza tutte le 87 divisioni ATECO 2025 sui soggetti scoperti e distingue risultati/nessun risultato.', 'REQUIRED_AUTOMATABLE')
on conflict(provider_key) do update set
 label=excluded.label,provider_type=excluded.provider_type,mode=excluded.mode,base_url=excluded.base_url,
 secret_names=excluded.secret_names,enabled=true,credential_status=excluded.credential_status,
 runtime_status=excluded.runtime_status,notes=excluded.notes,completion_class=excluded.completion_class,updated_at=now();

update public.f1_email_radar_providers set
 completion_class='REQUIRED_AUTOMATABLE',
 runtime_status=case when provider_key='FONTI_LOCALI' then 'READY_ZERO_CREDENTIAL' else 'READY' end,
 updated_at=now()
where provider_key in ('FONTI_LOCALI','SITI_UFFICIALI');

update public.f1_email_radar_providers set
 completion_class=case
   when provider_key in ('INI_PEC','INAD','ALBI_PROFESSIONALI') then 'INTERACTIVE_NOT_REQUIRED'
   when runtime_status in ('CREDENTIALS_REQUIRED','MANUAL_OR_AUTHORIZED_CONNECTOR') then 'OPTIONAL_NOT_CONFIGURED'
   else 'OPTIONAL_CONFIGURED'
 end,
 runtime_status=case
   when provider_key in ('INI_PEC','INAD','ALBI_PROFESSIONALI') then 'INTERACTIVE_NOT_REQUIRED'
   when runtime_status='CREDENTIALS_REQUIRED' then 'OPTIONAL_NOT_CONFIGURED'
   else runtime_status end,
 updated_at=now()
where provider_key in ('REGISTRO_IMPRESE','INI_PEC','INAD','ALBI_PROFESSIONALI','SEARCH_PROVIDER','GOOGLE_PLACES');

-- The live migration also replaces:
-- public.f1_email_radar_recalc_run(uuid)
-- public.f1_email_radar_service_upsert_entity(uuid,jsonb)
-- with the autonomous required-provider coverage and stronger provenance/deduplication versions.
