create or replace function public.f1_territory_sign_duplicates(
  p_phone_normalized text default '',p_comune text default '',p_via text default '',p_civico text default '',p_sign_type text default '')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_phone_digits text:=regexp_replace(coalesce(p_phone_normalized,''),'[^0-9]','','g');
begin
  if v_uid is null then raise exception 'ACCESSO RICHIESTO'; end if;
  if not exists(select 1 from public.f1_staff_profiles s where s.user_id=v_uid and s.status='ACTIVE') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  return coalesce((
    with d as (
      select 'SIGN'::text source_type,o.observation_id::text record_id,o.observation_id,null::text lead_id,o.observed_at event_at,
        o.comune,o.via,o.civico,o.sign_type,o.phone_normalized phone,o.workflow_state status,o.next_action,''::text display_name,
        (length(v_phone_digits)>=7 and right(regexp_replace(coalesce(o.phone_normalized,''),'[^0-9]','','g'),10)=right(v_phone_digits,10)) same_phone,
        (lower(trim(o.comune))=lower(trim(coalesce(p_comune,''))) and lower(trim(o.via))=lower(trim(coalesce(p_via,''))) and trim(o.civico)=trim(coalesce(p_civico,''))) same_place
      from public.f1_territory_observations o
      where o.observation_type='CARTELLO_IMMOBILIARE' and o.observed_at>=now()-interval '180 days'
        and ((length(v_phone_digits)>=7 and right(regexp_replace(coalesce(o.phone_normalized,''),'[^0-9]','','g'),10)=right(v_phone_digits,10))
          or (trim(coalesce(p_comune,''))<>'' and trim(coalesce(p_via,''))<>'' and trim(coalesce(p_civico,''))<>'' and lower(trim(o.comune))=lower(trim(p_comune)) and lower(trim(o.via))=lower(trim(p_via)) and trim(o.civico)=trim(p_civico) and (trim(coalesce(p_sign_type,''))='' or o.sign_type=trim(p_sign_type))))
      union all
      select 'LEAD'::text source_type,l.lead_id::text record_id,null::uuid observation_id,l.lead_id::text lead_id,l.updated_at event_at,
        coalesce(l.comune,'') comune,coalesce(l.via,'') via,coalesce(l.civico,'') civico,''::text sign_type,coalesce(l.telefono,'') phone,
        coalesce(l.status,'') status,coalesce(l.next_action,'') next_action,trim(concat_ws(' ',l.nome,l.cognome)) display_name,
        (length(v_phone_digits)>=7 and right(regexp_replace(coalesce(l.telefono,''),'[^0-9]','','g'),10)=right(v_phone_digits,10)) same_phone,
        (lower(trim(coalesce(l.comune,'')))=lower(trim(coalesce(p_comune,''))) and lower(trim(coalesce(l.via,'')))=lower(trim(coalesce(p_via,''))) and trim(coalesce(l.civico,''))=trim(coalesce(p_civico,''))) same_place
      from public.leads l
      where coalesce(l.deleted,false)=false
        and ((length(v_phone_digits)>=7 and right(regexp_replace(coalesce(l.telefono,''),'[^0-9]','','g'),10)=right(v_phone_digits,10))
          or (trim(coalesce(p_comune,''))<>'' and trim(coalesce(p_via,''))<>'' and trim(coalesce(p_civico,''))<>'' and lower(trim(coalesce(l.comune,'')))=lower(trim(p_comune)) and lower(trim(coalesce(l.via,'')))=lower(trim(p_via)) and trim(coalesce(l.civico,''))=trim(p_civico)))
    )
    select jsonb_agg(to_jsonb(x) order by x.event_at desc) from (select * from d order by event_at desc limit 20) x
  ),'[]'::jsonb);
end;$$;
revoke all on function public.f1_territory_sign_duplicates(text,text,text,text,text) from public,anon;
grant execute on function public.f1_territory_sign_duplicates(text,text,text,text,text) to authenticated;
