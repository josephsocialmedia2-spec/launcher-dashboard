alter table public.f1_territory_observations
  add column if not exists assigned_context text not null default 'FIELD',
  add column if not exists office_status text not null default '',
  add column if not exists office_verified_at timestamptz,
  add column if not exists office_verified_by uuid,
  add column if not exists last_office_action_at timestamptz,
  add column if not exists last_office_action_by uuid;

create index if not exists f1_territory_observations_office_queue_idx
  on public.f1_territory_observations(assigned_context,office_status,observed_at desc)
  where observation_type='CARTELLO_IMMOBILIARE';

update public.f1_territory_observations
set assigned_context='OFFICE',
    office_status=case when trim(coalesce(office_status,''))='' then 'DA_LAVORARE' else office_status end,
    next_action=case
      when phone_confirmed and trim(coalesce(phone_normalized,''))<>'' then 'VERIFICA CARTELLO IN UFFICIO'
      else 'VERIFICA CARTELLO / CERCA RECAPITO IN UFFICIO'
    end,
    updated_at=now()
where observation_type='CARTELLO_IMMOBILIARE';

create or replace function public.f1_territory_sign_confirm(
  p_progress_id uuid,p_comune text,p_zona text,p_via text,p_civico text,p_sign_type text,
  p_property_type text default '',p_phone_ocr_raw text default '',p_phone_normalized text default '',
  p_phone_confirmed boolean default false,p_phone_confidence text default '',p_ocr_text_raw text default '',
  p_ocr_text_confirmed text default '',p_notes text default '',p_latitude double precision default null,
  p_longitude double precision default null,p_gps_accuracy double precision default null,
  p_captured_at timestamptz default now(),p_client_event_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_progress public.f1_territory_progress%rowtype;v_row public.f1_territory_observations%rowtype;
  v_state text;v_next text;v_phone text:=trim(coalesce(p_phone_normalized,''));
  v_type text:=upper(trim(coalesce(p_sign_type,'ALTRO')));
begin
  if p_client_event_id is not null then
    select * into v_row from public.f1_territory_observations where user_id=auth.uid() and client_event_id=p_client_event_id limit 1;
    if found then return to_jsonb(v_row); end if;
  end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  if trim(coalesce(p_via,''))='' then raise exception 'VIA OBBLIGATORIA'; end if;
  if trim(coalesce(p_civico,''))='' then raise exception 'CIVICO DA CONFERMARE'; end if;
  if trim(coalesce(p_ocr_text_confirmed,''))='' then raise exception 'TESTO CARTELLO DA CONFERMARE'; end if;
  if coalesce(p_phone_confirmed,false) and v_phone='' then raise exception 'NUMERO CONFERMATO MA NON VALIDO'; end if;
  if coalesce(p_phone_confirmed,false) and v_phone<>'' then
    v_state:='RECAPITO_TROVATO';v_next:='VERIFICA CARTELLO IN UFFICIO';
  else
    v_state:='RECAPITO_MANCANTE';v_next:='VERIFICA CARTELLO / CERCA RECAPITO IN UFFICIO';
  end if;
  insert into public.f1_territory_observations(
    user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,notes,status,
    workflow_state,next_action,priority,updated_by,sign_type,property_type,phone_ocr_raw,phone_normalized,
    phone_confirmed,phone_confidence,ocr_text_raw,ocr_text_confirmed,latitude,longitude,gps_accuracy,captured_at,
    client_event_id,assigned_context,office_status)
  values(auth.uid(),v_progress.progress_id,v_progress.session_id,'CARTELLO_IMMOBILIARE',v_type,
    trim(coalesce(p_comune,v_progress.comune)),trim(coalesce(p_zona,v_progress.zona)),trim(p_via),trim(p_civico),
    trim(p_ocr_text_confirmed),'CARTELLO / OSSERVAZIONE TERRITORIALE',trim(coalesce(p_notes,'')),'DA_INSERIRE_CRM',
    v_state,v_next,'ALTA',auth.uid(),v_type,upper(trim(coalesce(p_property_type,''))),trim(coalesce(p_phone_ocr_raw,'')),
    v_phone,coalesce(p_phone_confirmed,false),upper(trim(coalesce(p_phone_confidence,''))),trim(coalesce(p_ocr_text_raw,'')),
    trim(p_ocr_text_confirmed),p_latitude,p_longitude,p_gps_accuracy,coalesce(p_captured_at,now()),p_client_event_id,'OFFICE','DA_LAVORARE')
  returning * into v_row;
  if v_progress.session_id is not null then
    update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid();
  end if;
  return to_jsonb(v_row);
end;$$;

create or replace function public.f1_territory_admin_signs(p_search text default '',p_status text default '',p_limit integer default 200)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;v_search text:=lower(trim(coalesce(p_search,'')));
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.observed_at desc) from (
    select o.observation_id,o.user_id,o.progress_id,o.observed_at,o.comune,o.zona,o.via,o.civico,o.sign_type,o.property_type,
      o.phone_ocr_raw,o.phone_normalized,o.phone_confirmed,o.phone_confidence,o.ocr_text_raw,o.ocr_text_confirmed,o.notes,
      o.workflow_state,o.next_action,o.status,o.assigned_context,o.office_status,o.office_verified_at,o.office_verified_by,
      o.last_office_action_at,o.last_office_action_by,o.latitude,o.longitude,o.gps_accuracy,o.captured_at,o.photo_storage_path,
      s.first_name,s.last_name,o.updated_at
    from public.f1_territory_observations o left join public.f1_staff_profiles s on s.user_id=o.user_id
    where o.observation_type='CARTELLO_IMMOBILIARE' and o.assigned_context='OFFICE'
      and (trim(coalesce(p_status,''))='' or o.workflow_state=trim(p_status) or o.status=trim(p_status) or o.office_status=trim(p_status))
      and (v_search='' or lower(concat_ws(' ',o.comune,o.zona,o.via,o.civico,o.sign_type,o.property_type,o.phone_normalized,o.ocr_text_confirmed,s.first_name,s.last_name)) like '%'||v_search||'%')
    order by o.observed_at desc limit greatest(1,least(coalesce(p_limit,200),500))) q),'[]'::jsonb);
end;$$;

create or replace function public.f1_territory_office_verify_sign(p_observation_id uuid,p_phone_valid boolean,p_phone_normalized text default '',p_note text default '')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;v_obs public.f1_territory_observations%rowtype;v_inter public.interactions%rowtype;v_phone text:=trim(coalesce(p_phone_normalized,''));v_next text;v_state text;
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  select * into v_obs from public.f1_territory_observations where observation_id=p_observation_id and observation_type='CARTELLO_IMMOBILIARE' for update;
  if not found then raise exception 'CARTELLO NON DISPONIBILE'; end if;
  if p_phone_valid and v_phone='' then raise exception 'NUMERO DA CONFERMARE'; end if;
  if p_phone_valid then
    v_state:='RECAPITO_TROVATO';v_next:='CHIAMA DA UFFICIO';
    update public.f1_territory_observations set phone_normalized=v_phone,phone_confirmed=true,phone_confidence='UFFICIO_VERIFICATO',workflow_state=v_state,next_action=v_next,office_status='VERIFICATO',office_verified_at=now(),office_verified_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),version=version+1 where observation_id=p_observation_id returning * into v_obs;
  else
    v_state:='RECAPITO_DA_VERIFICARE';v_next:='VERIFICA / CERCA RECAPITO IN UFFICIO';
    update public.f1_territory_observations set phone_confirmed=false,workflow_state=v_state,next_action=v_next,office_status='DA_VERIFICARE',office_verified_at=now(),office_verified_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),version=version+1 where observation_id=p_observation_id returning * into v_obs;
  end if;
  insert into public.interactions(user_id,interaction_type,direction,outcome,note,next_action,metadata)
  values(auth.uid(),'OFFICE_VERIFY','OUTBOUND',case when p_phone_valid then 'NUMERO_VERIFICATO' else 'NUMERO_DA_VERIFICARE' end,trim(coalesce(p_note,'')),v_next,jsonb_build_object('territory_observation_id',p_observation_id,'source','CARTELLO_TERRITORIALE','phone',v_phone,'comune',v_obs.comune,'via',v_obs.via,'civico',v_obs.civico)) returning * into v_inter;
  return jsonb_build_object('ok',true,'observation',to_jsonb(v_obs),'interaction',to_jsonb(v_inter));
end;$$;

create or replace function public.f1_territory_office_call_result(p_observation_id uuid,p_outcome text,p_note text default '',p_callback_date date default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;v_obs public.f1_territory_observations%rowtype;v_inter public.interactions%rowtype;v_out text:=upper(replace(trim(coalesce(p_outcome,'')),' ','_'));v_state text;v_next text;v_office text:='LAVORATO';
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  select * into v_obs from public.f1_territory_observations where observation_id=p_observation_id and observation_type='CARTELLO_IMMOBILIARE' for update;
  if not found then raise exception 'CARTELLO NON DISPONIBILE'; end if;
  if trim(coalesce(v_obs.phone_normalized,''))='' then raise exception 'NESSUN NUMERO DISPONIBILE'; end if;
  case v_out
    when 'NON_RISPONDE' then v_state:='DA_RICHIAMARE';v_next:='RICHIAMA';v_office:='DA_RICHIAMARE';
    when 'NUMERO_ERRATO' then v_state:='RECAPITO_DA_VERIFICARE';v_next:='VERIFICA / CERCA RECAPITO';v_office:='DA_VERIFICARE';
    when 'RICHIAMARE' then if p_callback_date is null then raise exception 'INDICA LA DATA DEL RICHIAMO'; end if;v_state:='DA_RICHIAMARE';v_next:='RICHIAMA IL '||to_char(p_callback_date,'DD/MM/YYYY');v_office:='DA_RICHIAMARE';
    when 'PROPRIETARIO_CONTATTATO' then v_state:='DA_QUALIFICARE';v_next:='QUALIFICA ESIGENZA';
    when 'AGENZIA' then v_state:='AGENZIA';v_next:='VALUTA CARTELLO AGENZIA';
    when 'NUMERO_NON_PERTINENTE' then v_state:='RECAPITO_DA_VERIFICARE';v_next:='CERCA RECAPITO';v_office:='DA_VERIFICARE';
    when 'INTERESSATO_AD_APPROFONDIRE' then v_state:='DA_QUALIFICARE';v_next:='QUALIFICA ESIGENZA';
    when 'APPUNTAMENTO_DA_FISSARE' then v_state:='DA_APPUNTAMENTO';v_next:='FISSA APPUNTAMENTO';
    when 'DISPONIBILE_AD_APPUNTAMENTO' then v_state:='DA_APPUNTAMENTO';v_next:='FISSA APPUNTAMENTO';
    when 'NON_CONTATTARE' then v_state:='NON_CONTATTARE';v_next:='NON CONTATTARE';
    else raise exception 'ESITO TELEFONATA NON VALIDO';
  end case;
  update public.f1_territory_observations set workflow_state=v_state,next_action=v_next,office_status=v_office,last_office_action_at=now(),last_office_action_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),version=version+1 where observation_id=p_observation_id returning * into v_obs;
  insert into public.interactions(user_id,interaction_type,direction,outcome,note,next_action,next_action_date,metadata)
  values(auth.uid(),'PHONE','OUTBOUND',v_out,trim(coalesce(p_note,'')),v_next,p_callback_date,jsonb_build_object('territory_observation_id',p_observation_id,'source','CARTELLO_TERRITORIALE','phone',v_obs.phone_normalized,'comune',v_obs.comune,'via',v_obs.via,'civico',v_obs.civico,'sign_type',v_obs.sign_type)) returning * into v_inter;
  return jsonb_build_object('ok',true,'observation',to_jsonb(v_obs),'interaction',to_jsonb(v_inter));
end;$$;

create or replace function public.f1_territory_office_sign_history(p_observation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  return jsonb_build_object('observation',(select to_jsonb(o) from public.f1_territory_observations o where o.observation_id=p_observation_id and o.observation_type='CARTELLO_IMMOBILIARE'),'interactions',coalesce((select jsonb_agg(to_jsonb(i) order by i.occurred_at asc) from public.interactions i where i.metadata->>'territory_observation_id'=p_observation_id::text),'[]'::jsonb));
end;$$;

revoke all on function public.f1_territory_sign_confirm(uuid,text,text,text,text,text,text,text,text,boolean,text,text,text,text,double precision,double precision,double precision,timestamptz,uuid) from public,anon;
revoke all on function public.f1_territory_admin_signs(text,text,integer) from public,anon;
revoke all on function public.f1_territory_office_verify_sign(uuid,boolean,text,text) from public,anon;
revoke all on function public.f1_territory_office_call_result(uuid,text,text,date) from public,anon;
revoke all on function public.f1_territory_office_sign_history(uuid) from public,anon;
grant execute on function public.f1_territory_sign_confirm(uuid,text,text,text,text,text,text,text,text,boolean,text,text,text,text,double precision,double precision,double precision,timestamptz,uuid) to authenticated;
grant execute on function public.f1_territory_admin_signs(text,text,integer) to authenticated;
grant execute on function public.f1_territory_office_verify_sign(uuid,boolean,text,text) to authenticated;
grant execute on function public.f1_territory_office_call_result(uuid,text,text,date) to authenticated;
grant execute on function public.f1_territory_office_sign_history(uuid) to authenticated;
