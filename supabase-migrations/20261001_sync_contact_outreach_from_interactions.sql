create or replace function public.f1_sync_contact_outreach_from_interaction_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_type text := upper(coalesce(new.interaction_type,''));
  v_direction text := upper(coalesce(new.direction,'OUTBOUND'));
  v_channel text;
begin
  if v_direction <> 'OUTBOUND' then
    return new;
  end if;

  if v_type = 'CALL' then
    v_channel := 'CALL';
  elsif v_type in ('WHATSAPP','SMS','EMAIL','MESSAGE') then
    v_channel := 'MESSAGE';
  else
    return new;
  end if;

  insert into public.f1_contact_outreach_events(
    user_id,contact_ref,channel,occurred_at,source,source_event_id,display_name,metadata
  )
  values(
    new.user_id,
    coalesce(nullif(new.lead_id,''),new.task_id::text,''),
    v_channel,
    new.occurred_at,
    coalesce(new.metadata->>'origin','crm-interaction'),
    'interaction:'||new.interaction_id::text,
    coalesce(new.metadata->>'display_name',''),
    jsonb_build_object(
      'interaction_id',new.interaction_id,
      'task_id',coalesce(new.task_id::text,''),
      'outcome',coalesce(new.outcome,''),
      'interaction_type',new.interaction_type,
      'db_trigger',true
    ) || coalesce(new.metadata,'{}'::jsonb)
  )
  on conflict (user_id,source_event_id) do nothing;

  return new;
end
$$;

revoke all on function public.f1_sync_contact_outreach_from_interaction_v1() from public;
revoke all on function public.f1_sync_contact_outreach_from_interaction_v1() from anon;
revoke all on function public.f1_sync_contact_outreach_from_interaction_v1() from authenticated;

drop trigger if exists f1_interactions_contact_outreach_v1 on public.interactions;
create trigger f1_interactions_contact_outreach_v1
after insert or update of interaction_type,direction,occurred_at,metadata
on public.interactions
for each row
execute function public.f1_sync_contact_outreach_from_interaction_v1();
