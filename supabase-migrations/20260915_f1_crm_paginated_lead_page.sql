create or replace function public.f1_crm_lead_page(
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
  due_task_count bigint,
  filtered_count bigint,
  total_count bigint,
  core4_total bigint,
  won_total bigint,
  dnc_total bigint
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
  select t.lead_id, count(*)::bigint as due_task_count, max(t.priority) as max_due_priority
  from public.tasks t
  where t.user_id = auth.uid()
    and upper(coalesce(t.status,'OPEN')) not in ('DONE','CANCELLED')
    and (t.due_date is null or t.due_date <= now())
  group by t.lead_id
),
metrics as (
  select
    count(*)::bigint as total_count,
    count(*) filter (where core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED'))::bigint as core4_total,
    count(*) filter (where upper(status) in ('INCARICO','ACQUISITO'))::bigint as won_total,
    count(*) filter (where do_not_contact or upper(status)='NON_CONTATTARE')::bigint as dnc_total
  from lead_base
),
filtered as (
  select b.*, coalesce(td.due_task_count,0)::bigint as due_task_count, coalesce(td.max_due_priority,0) as max_due_priority
  from lead_base b
  left join task_due td on td.lead_id = b.lead_id
  where
    (coalesce(p_status,'') = '' or b.status = p_status)
    and (
      coalesce(p_filter,'') = ''
      or (p_filter='CORE4' and b.core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED'))
      or (p_filter='DUE' and coalesce(td.due_task_count,0) > 0)
      or (p_filter='RPO' and coalesce(b.telefono,'') <> '' and b.rpo_status='DA_VERIFICARE')
    )
    and (
      coalesce(trim(p_search),'') = ''
      or concat_ws(' ',b.nome,b.cognome,b.telefono,b.email,b.comune,b.via,b.zona,b.source,b.source_url,b.source_type,b.lead_reason,b.notes,b.status)
         ilike '%' || trim(p_search) || '%'
    )
)
select
  f.lead_id,f.pillar,f.source_type,f.source,f.source_url,f.nome,f.cognome,f.azienda,f.telefono,f.email,
  f.comune,f.via,f.civico,f.zona,f.immobile_id,f.competitor_agency,f.lead_reason,f.lead_score,f.confidence,
  f.status,f.last_contact,f.next_action,f.next_action_date,f.assigned_to,f.privacy_basis,f.do_not_contact,
  f.rpo_status,f.updated_at,coalesce(f.market_data,'{}'::jsonb),f.due_task_count,
  count(*) over()::bigint as filtered_count,m.total_count,m.core4_total,m.won_total,m.dnc_total
from filtered f
cross join metrics m
order by
  (f.due_task_count > 0) desc,
  f.max_due_priority desc,
  (f.core_category in ('PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED')) desc,
  f.lead_score desc,
  f.next_action_date asc nulls last,
  f.updated_at desc
limit greatest(1, least(coalesce(p_limit,50),100))
offset greatest(coalesce(p_offset,0),0);
$$;

revoke all on function public.f1_crm_lead_page(integer,integer,text,text,text) from public, anon;
grant execute on function public.f1_crm_lead_page(integer,integer,text,text,text) to authenticated;
