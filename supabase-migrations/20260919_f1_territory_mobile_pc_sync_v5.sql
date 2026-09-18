-- F1 Territory mobile ↔ CRM ↔ dashboard PC v5
-- Applied to Supabase project nqnmlsmeiynxbdojeyjt on 2026-09-19.
-- Adds shared sync metadata, per-user daily mobile summary, and PC appointment/follow-up queues.

create or replace function public.f1_territory_mobile_crm_v5(p_limit integer default 1000)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,1000),2000));
  v_base jsonb;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  v_base:=public.f1_territory_mobile_crm_v4(v_limit);
  return v_base || jsonb_build_object(
    'server_synced_at',now(),
    'today_summary',jsonb_build_object(
      'civics',(select count(*) from public.f1_territory_civic_records r where r.user_id=auth.uid() and r.updated_at::date=current_date),
      'conversations',(select count(*) from public.f1_territory_conversations c where c.user_id=auth.uid() and c.created_at::date=current_date),
      'appointments',(select count(*) from public.f1_territory_conversations c where c.user_id=auth.uid() and c.appointment_at is not null and c.appointment_at::date=current_date),
      'notes',(select count(*) from public.f1_territory_notes n where n.user_id=auth.uid() and n.created_at::date=current_date),
      'letters_to_print',(select count(*) from public.f1_territory_letters l where l.user_id=auth.uid() and l.status='DA_STAMPARE'),
      'letters_to_deliver',(select count(*) from public.f1_territory_letters l where l.user_id=auth.uid() and l.status='DA_IMBUCARE')
    )
  );
end;
$function$;

create or replace function public.f1_territory_office_dashboard_v5(p_limit integer default 1500)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,1500),2500));
  v_base jsonb;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  v_base:=public.f1_territory_office_dashboard_v4(v_limit);
  return v_base || jsonb_build_object(
    'server_synced_at',now(),
    'appointments',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.appointment_at asc)
      from (
        select c.conversation_id,c.user_id,c.civic_record_id,c.target_type,c.person_name,c.phone,
               c.outcome,c.notes,c.status,c.next_action,c.value_offer,c.appointment_at,
               c.created_at,c.updated_at,r.comune,r.zona,r.via,r.civico
        from public.f1_territory_conversations c
        join public.f1_territory_civic_records r on r.civic_record_id=c.civic_record_id
        where f1_private.can_access_user(c.user_id)
          and c.appointment_at is not null
          and c.appointment_at >= date_trunc('day',now()) - interval '1 day'
        order by c.appointment_at asc limit v_limit
      ) x
    ),'[]'::jsonb),
    'followups',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from (
        select c.conversation_id,c.user_id,c.civic_record_id,c.target_type,c.person_name,c.phone,
               c.outcome,c.notes,c.status,c.next_action,c.value_offer,c.appointment_at,
               c.created_at,c.updated_at,r.comune,r.zona,r.via,r.civico
        from public.f1_territory_conversations c
        join public.f1_territory_civic_records r on r.civic_record_id=c.civic_record_id
        where f1_private.can_access_user(c.user_id)
          and (upper(coalesce(c.outcome,''))='DA RICONTATTARE'
               or upper(coalesce(c.status,'')) in ('RICHIAMO','FOLLOW_UP','DA_RICONTATTARE'))
        order by c.updated_at desc limit v_limit
      ) x
    ),'[]'::jsonb),
    'today_summary',jsonb_build_object(
      'civics',(select count(*) from public.f1_territory_civic_records r where f1_private.can_access_user(r.user_id) and r.updated_at::date=current_date),
      'conversations',(select count(*) from public.f1_territory_conversations c where f1_private.can_access_user(c.user_id) and c.created_at::date=current_date),
      'appointments',(select count(*) from public.f1_territory_conversations c where f1_private.can_access_user(c.user_id) and c.appointment_at is not null and c.appointment_at::date=current_date),
      'notes',(select count(*) from public.f1_territory_notes n where f1_private.can_access_user(n.user_id) and n.created_at::date=current_date),
      'letters_to_print',(select count(*) from public.f1_territory_letters l where f1_private.can_access_user(l.user_id) and l.status='DA_STAMPARE'),
      'letters_to_deliver',(select count(*) from public.f1_territory_letters l where f1_private.can_access_user(l.user_id) and l.status='DA_IMBUCARE')
    )
  );
end;
$function$;

grant execute on function public.f1_territory_mobile_crm_v5(integer) to authenticated;
grant execute on function public.f1_territory_office_dashboard_v5(integer) to authenticated;
