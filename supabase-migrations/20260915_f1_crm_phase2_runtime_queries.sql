create or replace function public.f1_crm_kpis()
returns table (
  leads bigint,
  core4 bigint,
  tasks_due bigint,
  interactions bigint,
  assignments bigint,
  do_not_contact bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with lead_base as (
  select
    l.status,
    l.do_not_contact,
    l.source_type,
    l.lead_reason,
    case
      when upper(l.source_type) = 'PAST_CLIENT' or upper(l.lead_reason) like '%PAST_CLIENT%' then 'PAST_CLIENT'
      when upper(l.source_type) = 'COI' or upper(l.lead_reason) like '%COI%' then 'COI'
      when upper(l.source_type) = 'FSBO' or upper(l.lead_reason) ~ '(^|[^A-Z])FSBO([^A-Z]|$)' then 'FSBO'
      when upper(l.source_type) in ('EXPIRED_CANDIDATE','EXPIRED_VERIFIED') or upper(l.lead_reason) ~ '(SCADUT|EXPIRED|NON_PIU_RILEVATO|CAMBIO_AGENZIA)' then 'EXPIRED_OR_POSSIBLE_EXPIRED'
      else ''
    end as core_category
  from public.leads l
  where l.user_id = auth.uid() and l.deleted = false
),
lead_counts as (
  select
    count(*)::bigint as leads,
    count(*) filter (where core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED'))::bigint as core4,
    count(*) filter (where upper(status) in ('INCARICO','ACQUISITO'))::bigint as assignments,
    count(*) filter (where do_not_contact or upper(status)='NON_CONTATTARE')::bigint as do_not_contact
  from lead_base
),
task_counts as (
  select count(*)::bigint as tasks_due
  from public.tasks t
  where t.user_id = auth.uid()
    and upper(coalesce(t.status,'OPEN')) not in ('DONE','CANCELLED')
    and (t.due_date is null or t.due_date <= now())
),
interaction_counts as (
  select count(*)::bigint as interactions
  from public.interactions i
  where i.user_id = auth.uid()
)
select l.leads,l.core4,t.tasks_due,i.interactions,l.assignments,l.do_not_contact
from lead_counts l cross join task_counts t cross join interaction_counts i;
$$;

create or replace function public.f1_crm_visible_tasks(p_lead_ids text[])
returns table (
  task_id uuid,
  lead_id text,
  property_id text,
  pillar smallint,
  task_type text,
  reason text,
  priority smallint,
  due_date timestamptz,
  status text,
  outcome text,
  metadata jsonb,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
select t.task_id,t.lead_id,t.property_id,t.pillar,t.task_type,t.reason,t.priority,t.due_date,t.status,t.outcome,t.metadata,t.updated_at
from public.tasks t
where t.user_id = auth.uid()
  and t.lead_id = any(coalesce(p_lead_ids,array[]::text[]))
  and upper(coalesce(t.status,'OPEN')) not in ('DONE','CANCELLED')
order by t.priority desc, t.due_date asc nulls first, t.updated_at desc;
$$;

create or replace function public.f1_crm_lead_page_v2(
  p_offset integer default 0,
  p_limit integer default 50,
  p_search text default '',
  p_status text default '',
  p_filter text default ''
)
returns table (
  lead_id text,
  pillar smallint,
  source_type text,
  source text,
  source_url text,
  nome text,
  cognome text,
  azienda text,
  telefono text,
  email text,
  comune text,
  via text,
  civico text,
  zona text,
  immobile_id text,
  competitor_agency text,
  lead_reason text,
  lead_score smallint,
  confidence text,
  status text,
  last_contact timestamptz,
  next_action text,
  next_action_date timestamptz,
  assigned_to text,
  privacy_basis text,
  do_not_contact boolean,
  rpo_status text,
  updated_at timestamptz,
  market_data jsonb,
  interaction_count bigint,
  filtered_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with lead_base as (
  select
    l.lead_id,l.pillar,l.source_type,l.source,l.source_url,l.nome,l.cognome,l.azienda,l.telefono,l.email,
    l.comune,l.via,l.civico,l.zona,l.immobile_id,l.competitor_agency,l.lead_reason,l.lead_score,l.confidence,
    l.status,l.last_contact,l.next_action,l.next_action_date,l.assigned_to,l.notes,l.privacy_basis,l.do_not_contact,
    l.rpo_status,l.updated_at,l.market_data,
    case
      when upper(l.source_type) = 'PAST_CLIENT' or upper(l.lead_reason) like '%PAST_CLIENT%' then 'PAST_CLIENT'
      when upper(l.source_type) = 'COI' or upper(l.lead_reason) like '%COI%' then 'COI'
      when upper(l.source_type) = 'FSBO' or upper(l.lead_reason) ~ '(^|[^A-Z])FSBO([^A-Z]|$)' then 'FSBO'
      when upper(l.source_type) in ('EXPIRED_CANDIDATE','EXPIRED_VERIFIED') or upper(l.lead_reason) ~ '(SCADUT|EXPIRED|NON_PIU_RILEVATO|CAMBIO_AGENZIA)' then 'EXPIRED_OR_POSSIBLE_EXPIRED'
      else ''
    end as core_category
  from public.leads l
  where l.user_id = auth.uid() and l.deleted = false
),
task_due as (
  select t.lead_id, count(*)::bigint as due_task_count, max(t.priority) as max_due_priority,
         min(t.due_date) as nearest_due
  from public.tasks t
  where t.user_id = auth.uid()
    and upper(coalesce(t.status,'OPEN')) not in ('DONE','CANCELLED')
    and (t.due_date is null or t.due_date <= now())
  group by t.lead_id
),
filtered as (
  select b.*, coalesce(td.due_task_count,0)::bigint as due_task_count,
         coalesce(td.max_due_priority,0) as max_due_priority, td.nearest_due
  from lead_base b
  left join task_due td on td.lead_id = b.lead_id
  where
    (coalesce(p_status,'') = '' or b.status = p_status)
    and (
      coalesce(p_filter,'') = ''
      or (p_filter='CORE4' and b.core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED'))
      or (p_filter='DUE' and coalesce(td.due_task_count,0) > 0)
      or (p_filter='RPO' and coalesce(b.telefono,'') <> '' and b.rpo_status='DA_VERIFICARE')
      or (p_filter='MARKET_LISTING' and upper(b.source_type) in ('MARKET_LISTING','MARKET_SIGNAL','COMPETITOR_LISTING','FSBO_CANDIDATE','EXPIRED_CANDIDATE','EXPIRED_VERIFIED'))
    )
    and (
      coalesce(trim(p_search),'') = ''
      or concat_ws(' ',b.nome,b.cognome,b.telefono,b.email,b.comune,b.via,b.zona,b.source,b.source_url,b.source_type,b.lead_reason,b.notes,b.status)
         ilike '%' || trim(p_search) || '%'
    )
),
paged as (
  select f.*, count(*) over()::bigint as filtered_count
  from filtered f
  order by
    (f.due_task_count > 0) desc,
    f.max_due_priority desc,
    (f.core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED')) desc,
    f.lead_score desc,
    f.nearest_due asc nulls last,
    f.next_action_date asc nulls last,
    f.updated_at desc
  limit greatest(1, least(coalesce(p_limit,50),100))
  offset greatest(coalesce(p_offset,0),0)
),
interaction_counts as (
  select i.lead_id,count(*)::bigint as interaction_count
  from public.interactions i
  where i.user_id = auth.uid() and i.lead_id in (select lead_id from paged)
  group by i.lead_id
)
select
  p.lead_id,p.pillar,p.source_type,p.source,p.source_url,p.nome,p.cognome,p.azienda,p.telefono,p.email,
  p.comune,p.via,p.civico,p.zona,p.immobile_id,p.competitor_agency,p.lead_reason,p.lead_score,p.confidence,
  p.status,p.last_contact,p.next_action,p.next_action_date,p.assigned_to,p.privacy_basis,p.do_not_contact,
  p.rpo_status,p.updated_at,coalesce(p.market_data,'{}'::jsonb),coalesce(ic.interaction_count,0),p.filtered_count
from paged p
left join interaction_counts ic on ic.lead_id = p.lead_id;
$$;

revoke all on function public.f1_crm_kpis() from public, anon;
revoke all on function public.f1_crm_visible_tasks(text[]) from public, anon;
revoke all on function public.f1_crm_lead_page_v2(integer,integer,text,text,text) from public, anon;
grant execute on function public.f1_crm_kpis() to authenticated;
grant execute on function public.f1_crm_visible_tasks(text[]) to authenticated;
grant execute on function public.f1_crm_lead_page_v2(integer,integer,text,text,text) to authenticated;
