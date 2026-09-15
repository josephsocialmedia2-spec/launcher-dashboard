create table if not exists public.f1_territory_progress (
  progress_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  session_id uuid references public.f1_territory_sessions(id) on delete set null,
  work_date date not null default current_date,
  comune text not null default '',
  zona text not null default '',
  via text not null default '',
  street_segment text not null default '',
  civic_start text not null default '',
  civic_end text not null default '',
  last_civic text not null default '',
  next_civic text not null default '',
  last_visit_at timestamptz,
  next_visit_at timestamptz,
  status text not null default 'DA_FARE' check (status in ('DA_FARE','IN_CORSO','PARZIALE','DA_CONSUNTIVARE','COMPLETATA','DA_RIPASSARE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.f1_territory_observations (
  observation_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  progress_id uuid not null references public.f1_territory_progress(progress_id) on delete cascade,
  session_id uuid references public.f1_territory_sessions(id) on delete set null,
  observed_at timestamptz not null default now(),
  observation_type text not null default '',
  news_type text not null default '',
  comune text not null default '',
  zona text not null default '',
  via text not null default '',
  civico text not null default '',
  building text not null default '',
  detail text not null default '',
  source text not null default '',
  person_name text not null default '',
  notes text not null default '',
  status text not null default 'OSSERVAZIONE' check (status in ('OSSERVAZIONE','DA_INSERIRE_CRM','INSERITA_CRM')),
  crm_record_id uuid references public.f1_real_estate_news(news_id) on delete set null,
  crm_inserted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.f1_territory_progress enable row level security;
alter table public.f1_territory_observations enable row level security;

revoke all on table public.f1_territory_progress from anon, authenticated;
revoke all on table public.f1_territory_observations from anon, authenticated;
grant select, insert, update, delete on table public.f1_territory_progress to authenticated;
grant select, insert, update, delete on table public.f1_territory_observations to authenticated;

drop policy if exists territory_progress_select_own on public.f1_territory_progress;
drop policy if exists territory_progress_insert_own on public.f1_territory_progress;
drop policy if exists territory_progress_update_own on public.f1_territory_progress;
drop policy if exists territory_progress_delete_own on public.f1_territory_progress;
create policy territory_progress_select_own on public.f1_territory_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy territory_progress_insert_own on public.f1_territory_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy territory_progress_update_own on public.f1_territory_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy territory_progress_delete_own on public.f1_territory_progress for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists territory_observations_select_own on public.f1_territory_observations;
drop policy if exists territory_observations_insert_own on public.f1_territory_observations;
drop policy if exists territory_observations_update_own on public.f1_territory_observations;
drop policy if exists territory_observations_delete_own on public.f1_territory_observations;
create policy territory_observations_select_own on public.f1_territory_observations for select to authenticated using ((select auth.uid()) = user_id);
create policy territory_observations_insert_own on public.f1_territory_observations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy territory_observations_update_own on public.f1_territory_observations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy territory_observations_delete_own on public.f1_territory_observations for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists f1_territory_progress_user_status_idx on public.f1_territory_progress(user_id,status,work_date desc,updated_at desc);
create index if not exists f1_territory_progress_location_idx on public.f1_territory_progress(user_id,comune,zona,via,work_date desc);
create index if not exists f1_territory_observations_progress_idx on public.f1_territory_observations(user_id,progress_id,observed_at desc);
create index if not exists f1_territory_observations_pending_idx on public.f1_territory_observations(user_id,status,observed_at) where status='DA_INSERIRE_CRM' and crm_record_id is null;

create or replace function public.f1_territory_panel_state()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with p as (
  select x.*
  from public.f1_territory_progress x
  where x.user_id = auth.uid()
    and x.status <> 'COMPLETATA'
  order by
    case x.status
      when 'DA_CONSUNTIVARE' then 0
      when 'IN_CORSO' then 1
      when 'PARZIALE' then 2
      when 'DA_RIPASSARE' then 3
      else 4
    end,
    x.work_date asc,
    x.updated_at desc
  limit 1
), s as (
  select x.*
  from public.f1_territory_sessions x
  where x.user_id = auth.uid()
    and exists (select 1 from p)
    and (
      x.id = (select session_id from p)
      or (
        (select session_id from p) is null
        and x.session_date = (select work_date from p)
      )
    )
  order by case when x.id = (select session_id from p) then 0 else 1 end, x.started_at desc
  limit 1
), o as (
  select x.*
  from public.f1_territory_observations x
  where x.user_id = auth.uid()
    and x.progress_id = (select progress_id from p)
), counts as (
  select
    count(*) filter (where upper(observation_type)='CONDOMINIO')::integer as condominiums,
    count(*) filter (where coalesce(news_type,'') <> '')::integer as observation_news,
    count(*) filter (where status='DA_INSERIRE_CRM' and crm_record_id is null)::integer as pending_news,
    count(*) filter (where status='INSERITA_CRM' and crm_record_id is not null)::integer as inserted_news
  from o
)
select jsonb_build_object(
  'progress', (select to_jsonb(p) from p),
  'summary', jsonb_build_object(
    'civics', coalesce((select civici_lavorati from s),0),
    'streets_in_progress', case when exists(select 1 from p) then 1 else 0 end,
    'condominiums', coalesce((select condominiums from counts),0),
    'activities', coalesce((select attivita_trovate from s),0),
    'contacts', coalesce((select nuovi_contatti from s),0),
    'news', greatest(coalesce((select nuove_notizie from s),0),coalesce((select observation_news from counts),0)),
    'pending_crm', coalesce((select pending_news from counts),0),
    'inserted_crm', coalesce((select inserted_news from counts),0),
    'callbacks', coalesce((select richiami_generati from s),0)
  ),
  'pending_news', coalesce((
    select jsonb_agg(to_jsonb(q) order by q.observed_at asc)
    from (
      select observation_id,progress_id,observed_at,observation_type,news_type,comune,zona,via,civico,building,detail,source,person_name,notes,status,crm_record_id
      from o
      where status='DA_INSERIRE_CRM' and crm_record_id is null
      order by observed_at asc
      limit 10
    ) q
  ),'[]'::jsonb)
);
$$;

revoke all on function public.f1_territory_panel_state() from public, anon;
grant execute on function public.f1_territory_panel_state() to authenticated;
