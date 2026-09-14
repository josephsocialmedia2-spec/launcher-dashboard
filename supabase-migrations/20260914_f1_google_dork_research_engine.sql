create extension if not exists pgcrypto;

create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  market_listing_id text not null,
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','ANALYZING','COMPLETED','PARTIAL','GOOGLE_VERIFICATION_REQUIRED','FAILED')),
  priority text not null default 'P1',
  interested boolean not null default true,
  seed jsonb not null default '{}'::jsonb,
  query_plan jsonb not null default '[]'::jsonb,
  completed_queries jsonb not null default '[]'::jsonb,
  dossier jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  current_query text not null default '',
  queries_total integer not null default 0,
  queries_completed integer not null default 0,
  results_found integer not null default 0,
  useful_references integer not null default 0,
  error text not null default '',
  lock_owner text not null default '',
  heartbeat_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  job_id uuid not null references public.research_jobs(id) on delete cascade,
  market_listing_id text not null,
  query text not null default '',
  title text not null default '',
  url text not null,
  canonical_url text not null,
  snippet text not null default '',
  domain text not null default '',
  result_type text not null default 'GOOGLE_RESULT',
  relevance text not null default 'TO_REVIEW',
  extracted jsonb not null default '{}'::jsonb,
  query_evidence jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, canonical_url)
);

create table if not exists public.research_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  job_id uuid not null references public.research_jobs(id) on delete cascade,
  market_listing_id text not null,
  entity_key text not null,
  entity_type text not null default 'REFERENCE',
  name text not null default '',
  organization text not null default '',
  role text not null default '',
  phone_raw text not null default '',
  phone_normalized text not null default '',
  email text not null default '',
  email_normalized text not null default '',
  pec text not null default '',
  website text not null default '',
  facebook_url text not null default '',
  instagram_url text not null default '',
  linkedin_url text not null default '',
  source_urls jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  verification_status text not null default 'DA_VERIFICARE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, entity_key)
);

alter table public.research_jobs enable row level security;
alter table public.research_results enable row level security;
alter table public.research_entities enable row level security;

revoke all on table public.research_jobs from anon, authenticated;
revoke all on table public.research_results from anon, authenticated;
revoke all on table public.research_entities from anon, authenticated;
grant select, insert, update, delete on table public.research_jobs to authenticated;
grant select, insert, update, delete on table public.research_results to authenticated;
grant select, insert, update, delete on table public.research_entities to authenticated;

create policy "f1 research_jobs user read" on public.research_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "f1 research_jobs user insert" on public.research_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "f1 research_jobs user update" on public.research_jobs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "f1 research_jobs user delete" on public.research_jobs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "f1 research_results user read" on public.research_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "f1 research_results user insert" on public.research_results for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "f1 research_results user update" on public.research_results for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "f1 research_results user delete" on public.research_results for delete to authenticated using ((select auth.uid()) = user_id);

create policy "f1 research_entities user read" on public.research_entities for select to authenticated using ((select auth.uid()) = user_id);
create policy "f1 research_entities user insert" on public.research_entities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "f1 research_entities user update" on public.research_entities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "f1 research_entities user delete" on public.research_entities for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists research_jobs_queue_idx on public.research_jobs(user_id,status,created_at);
create index if not exists research_jobs_listing_idx on public.research_jobs(user_id,market_listing_id,created_at desc);
create index if not exists research_results_job_idx on public.research_results(user_id,job_id,updated_at desc);
create index if not exists research_results_domain_idx on public.research_results(user_id,domain);
create index if not exists research_entities_job_idx on public.research_entities(user_id,job_id,verification_status);
create index if not exists research_entities_phone_idx on public.research_entities(user_id,phone_normalized);
create index if not exists research_entities_email_idx on public.research_entities(user_id,email_normalized);
