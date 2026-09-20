create or replace function public.f1_territory_add_categorized_news_v1(
  p_category text,
  p_comune text,
  p_via text,
  p_civico text default '',
  p_source text default 'INSERIMENTO MANUALE',
  p_source_url text default '',
  p_person_name text default '',
  p_phone text default '',
  p_detail text default '',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_gps_accuracy double precision default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  v_category text:=upper(trim(coalesce(p_category,'')));
  v_comune text:=trim(coalesce(p_comune,''));
  v_via text:=trim(coalesce(p_via,''));
  v_civico text:=trim(coalesce(p_civico,''));
  v_progress public.f1_territory_progress%rowtype;
  v_row public.f1_territory_observations%rowtype;
  v_detail text;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  if v_category <> all(array['SUCCESSIONE','TRASFERIMENTO','APPARTAMENTO VUOTO','RICHIESTA VALORE CASA','CARTELLO PRIVATO','VECCHIO INCARICO SCADUTO']) then
    raise exception 'CATEGORIA NOTIZIA NON VALIDA';
  end if;
  if v_comune='' then raise exception 'COMUNE OBBLIGATORIO'; end if;
  if v_via='' then raise exception 'VIA OBBLIGATORIA'; end if;
  select * into v_progress from public.f1_territory_progress
   where user_id=auth.uid() and lower(comune)=lower(v_comune) and lower(via)=lower(v_via) and status<>'COMPLETATA'
   order by updated_at desc limit 1;
  if not found then
    insert into public.f1_territory_progress(user_id,work_date,comune,zona,via,street_segment,civic_start,civic_end,last_civic,next_civic,status,civic_sequence,updated_by)
    values(auth.uid(),current_date,v_comune,'COMUNE',v_via,'',v_civico,'','',v_civico,'IN_CORSO','{}'::text[],auth.uid())
    returning * into v_progress;
  else
    update public.f1_territory_progress set work_date=current_date,status='IN_CORSO',next_civic=case when v_civico<>'' then v_civico else next_civic end,updated_at=now(),updated_by=auth.uid()
     where progress_id=v_progress.progress_id returning * into v_progress;
  end if;
  v_detail:=concat_ws(' — ',v_category,nullif(trim(coalesce(p_detail,'')),''));
  insert into public.f1_territory_observations(
    user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,person_name,notes,status,workflow_state,next_action,priority,next_action_at,updated_by,assigned_context,office_status,owner_status,phone_normalized,latitude,longitude,gps_accuracy,captured_at,market_source_url,market_source_observed_at
  ) values(
    auth.uid(),v_progress.progress_id,v_progress.session_id,'NOTIZIA_IMMOBILIARE',v_category,v_comune,coalesce(v_progress.zona,'COMUNE'),v_via,v_civico,v_detail,coalesce(nullif(trim(coalesce(p_source,'')),''),'INSERIMENTO MANUALE'),trim(coalesce(p_person_name,'')),'NOTIZIA TERRITORIALE F1','DA_INSERIRE_CRM','DA_VERIFICARE','VERIFICA NOTIZIA','ALTA',now(),auth.uid(),'FIELD','DA_LAVORARE','DA_VERIFICARE',trim(coalesce(p_phone,'')),p_latitude,p_longitude,p_gps_accuracy,case when p_latitude is not null and p_longitude is not null then now() else null end,trim(coalesce(p_source_url,'')),case when trim(coalesce(p_source_url,''))<>'' then now() else null end
  ) returning * into v_row;
  if v_progress.session_id is not null then update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
  return to_jsonb(v_row);
end;
$function$;
revoke all on function public.f1_territory_add_categorized_news_v1(text,text,text,text,text,text,text,text,text,double precision,double precision,double precision) from public,anon;
grant execute on function public.f1_territory_add_categorized_news_v1(text,text,text,text,text,text,text,text,text,double precision,double precision,double precision) to authenticated;