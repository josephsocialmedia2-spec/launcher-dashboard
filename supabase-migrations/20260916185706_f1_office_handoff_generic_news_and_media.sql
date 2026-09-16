drop policy if exists f1_territory_storage_select_team on storage.objects;
create policy f1_territory_storage_select_team on storage.objects
for select to authenticated
using (
  bucket_id='f1-territory-photos'
  and array_length(storage.foldername(name),1)>=1
  and (select f1_private.can_access_user(((storage.foldername(name))[1])::uuid))
);

create or replace function public.f1_territory_mobile_add_news(
  p_progress_id uuid,p_detail text,p_source text default '',p_person_name text default '',p_phone text default '',
  p_has_location boolean default true,p_knows_owner boolean default false,p_has_name boolean default false,
  p_has_contact boolean default false,p_talked_owner boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_row public.f1_territory_observations%rowtype;
  v_state text;v_next text;v_priority text:='ALTA';v_notes text;
  v_context text:='FIELD';v_office_status text:='';
begin
  if trim(coalesce(p_detail,''))='' then raise exception 'INFORMAZIONE CONCRETA OBBLIGATORIA'; end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  if not coalesce(p_has_location,false) then v_state:='DA_LOCALIZZARE';v_next:='LOCALIZZA IMMOBILE';
  elsif not coalesce(p_knows_owner,false) then v_state:='PROPRIETARIO_DA_IDENTIFICARE';v_next:='IDENTIFICA PROPRIETARIO';
  elsif not coalesce(p_has_name,false) then v_state:='IDENTITA_DA_COMPLETARE';v_next:='COMPLETA IDENTITA PROPRIETARIO';
  elsif not coalesce(p_has_contact,false) then v_state:='RECAPITO_DA_TROVARE';v_next:='CERCA RECAPITO';
  else v_state:='DA_LAVORARE_IN_UFFICIO';v_next:='VERIFICA IN UFFICIO';v_context:='OFFICE';v_office_status:='DA_LAVORARE'; end if;
  v_notes:=concat_ws(E'\n',case when trim(coalesce(p_phone,''))<>'' then 'RECAPITO: '||trim(p_phone) end,'STATO GUIDATO: '||v_state,'PROSSIMA AZIONE: '||v_next,case when v_context='OFFICE' then 'CONTESTO: UFFICIO' end);
  insert into public.f1_territory_observations(user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,person_name,notes,status,workflow_state,next_action,priority,updated_by,assigned_context,office_status)
  values(auth.uid(),v_progress.progress_id,v_progress.session_id,'NOTIZIA_IMMOBILIARE','DA_CLASSIFICARE',v_progress.comune,v_progress.zona,v_progress.via,coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.last_civic,''),nullif(v_progress.civic_start,''),''),trim(p_detail),trim(coalesce(p_source,'')),trim(coalesce(p_person_name,'')),v_notes,'DA_INSERIRE_CRM',v_state,v_next,v_priority,auth.uid(),v_context,v_office_status)
  returning * into v_row;
  if v_progress.session_id is not null then update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
  return to_jsonb(v_row);
end;$$;
revoke all on function public.f1_territory_mobile_add_news(uuid,text,text,text,text,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.f1_territory_mobile_add_news(uuid,text,text,text,text,boolean,boolean,boolean,boolean,boolean) to authenticated;
