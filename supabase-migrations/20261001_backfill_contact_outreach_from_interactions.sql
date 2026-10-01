create index if not exists f1_contact_outreach_user_time_idx
on public.f1_contact_outreach_events(user_id,occurred_at);

insert into public.f1_contact_outreach_events(
  user_id,contact_ref,channel,occurred_at,source,source_event_id,display_name,metadata
)
select
  i.user_id,
  coalesce(nullif(i.lead_id,''),i.task_id::text,''),
  case when upper(i.interaction_type)='CALL' then 'CALL' else 'MESSAGE' end,
  i.occurred_at,
  'crm-interaction-backfill',
  'interaction:'||i.interaction_id::text,
  '',
  jsonb_build_object(
    'interaction_id',i.interaction_id,
    'task_id',coalesce(i.task_id::text,''),
    'outcome',coalesce(i.outcome,''),
    'interaction_type',i.interaction_type,
    'backfilled',true
  )
from public.interactions i
where upper(i.direction)='OUTBOUND'
  and upper(i.interaction_type) in ('CALL','WHATSAPP','SMS','EMAIL','MESSAGE')
on conflict (user_id,source_event_id) do nothing;
