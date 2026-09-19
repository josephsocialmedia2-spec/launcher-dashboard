-- Remove the obsolete Cartelli Ufficio workflow while preserving territory data and history.
-- Existing observation/interactions/photo rows are intentionally retained.

drop function if exists public.f1_territory_admin_signs(text,text,integer);
drop function if exists public.f1_territory_office_verify_sign(uuid,boolean,text,text);
drop function if exists public.f1_territory_office_call_result(uuid,text,text,date);
drop function if exists public.f1_territory_office_sign_history(uuid);
drop function if exists public.f1_territory_office_kpis(date);
drop index if exists public.f1_territory_observations_office_queue_idx;

create or replace function public.f1_territory_sign_confirm(
  p_progress_id uuid,
  p_comune text,
  p_zona text,
  p_via text,
  p_civico text,
  p_sign_type text,
  p_property_type text default '',
  p_phone_ocr_raw text default '',
  p_phone_normalized text default '',
  p_phone_confirmed boolean default false,
  p_phone_confidence text default '',
  p_ocr_text_raw text default '',
  p_ocr_text_confirmed text default '',
  p_notes text default '',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_gps_accuracy double precision default null,
  p_captured_at timestamptz default now(),
  p_client_event_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_row public.f1_territory_observations%rowtype;
  v_state text;
  v_next text;
  v_phone text:=trim(coalesce(p_phone_normalized,''));
  v_type text:=upper(trim(coalesce(p_sign_type,'ALTRO')));
begin
  if p_client_event_id is not null then
    select * into v_row
    from public.f1_territory_observations
    where user_id=auth.uid() and client_event_id=p_client_event_id
    limit 1;
    if found then return to_jsonb(v_row); end if;
  end if;

  select * into v_progress
  from public.f1_territory_progress
  where progress_id=p_progress_id and user_id=auth.uid();

  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  if trim(coalesce(p_via,''))='' then raise exception 'VIA OBBLIGATORIA'; end if;
  if trim(coalesce(p_civico,''))='' then raise exception 'CIVICO DA CONFERMARE'; end if;
  if trim(coalesce(p_ocr_text_confirmed,''))='' then raise exception 'TESTO CARTELLO DA CONFERMARE'; end if;
  if coalesce(p_phone_confirmed,false) and v_phone='' then raise exception 'NUMERO CONFERMATO MA NON VALIDO'; end if;

  if coalesce(p_phone_confirmed,false) and v_phone<>'' then
    v_state:='RECAPITO_TROVATO';
    v_next:='VERIFICA DATI / INSERISCI NEL CRM';
  else
    v_state:='RECAPITO_MANCANTE';
    v_next:='CERCA RECAPITO / INSERISCI NEL CRM';
  end if;

  insert into public.f1_territory_observations(
    user_id,progress_id,session_id,observation_type,news_type,
    comune,zona,via,civico,detail,source,notes,status,
    workflow_state,next_action,priority,updated_by,
    sign_type,property_type,phone_ocr_raw,phone_normalized,phone_confirmed,phone_confidence,
    ocr_text_raw,ocr_text_confirmed,latitude,longitude,gps_accuracy,captured_at,client_event_id,
    assigned_context,office_status
  ) values (
    auth.uid(),v_progress.progress_id,v_progress.session_id,'CARTELLO_IMMOBILIARE',v_type,
    trim(coalesce(p_comune,v_progress.comune)),trim(coalesce(p_zona,v_progress.zona)),trim(p_via),trim(p_civico),
    trim(p_ocr_text_confirmed),'CARTELLO / OSSERVAZIONE TERRITORIALE',trim(coalesce(p_notes,'')),'DA_INSERIRE_CRM',
    v_state,v_next,'ALTA',auth.uid(),
    v_type,upper(trim(coalesce(p_property_type,''))),trim(coalesce(p_phone_ocr_raw,'')),v_phone,
    coalesce(p_phone_confirmed,false),upper(trim(coalesce(p_phone_confidence,''))),
    trim(coalesce(p_ocr_text_raw,'')),trim(p_ocr_text_confirmed),p_latitude,p_longitude,p_gps_accuracy,
    coalesce(p_captured_at,now()),p_client_event_id,
    'FIELD',''
  )
  returning * into v_row;

  if v_progress.session_id is not null then
    update public.f1_territory_sessions
    set nuove_notizie=nuove_notizie+1
    where id=v_progress.session_id and user_id=auth.uid();
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.f1_territory_sign_confirm(
  uuid,text,text,text,text,text,text,text,text,boolean,text,text,text,text,
  double precision,double precision,double precision,timestamptz,uuid
) from public,anon;
grant execute on function public.f1_territory_sign_confirm(
  uuid,text,text,text,text,text,text,text,text,boolean,text,text,text,text,
  double precision,double precision,double precision,timestamptz,uuid
) to authenticated;

-- Move only still-pending legacy office-queue cartelli into the normal territory -> CRM workflow.
-- Historical office status/timestamps are kept intact for audit/history purposes.
update public.f1_territory_observations
set assigned_context='FIELD',
    next_action=case
      when phone_confirmed and trim(coalesce(phone_normalized,''))<>'' then 'VERIFICA DATI / INSERISCI NEL CRM'
      else 'CERCA RECAPITO / INSERISCI NEL CRM'
    end,
    updated_at=now(),
    version=version+1
where observation_type='CARTELLO_IMMOBILIARE'
  and assigned_context='OFFICE'
  and status='DA_INSERIRE_CRM'
  and crm_record_id is null;
