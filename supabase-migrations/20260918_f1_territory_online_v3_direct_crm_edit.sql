
create or replace function public.f1_territory_civic_patch_record_v3(
  p_civic_record_id uuid,
  p_property_type text default null,
  p_signals text[] default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_row public.f1_territory_civic_records%rowtype;
  v_type text;
begin
  select * into v_row
  from public.f1_territory_civic_records
  where civic_record_id=p_civic_record_id
    and user_id=auth.uid()
  for update;
  if not found then raise exception 'IMMOBILE / CIVICO NON MODIFICABILE'; end if;

  if p_property_type is not null then
    v_type:=upper(trim(p_property_type));
    if v_type<>'' and v_type not in (
      'CONDOMINIO','APPARTAMENTO','VILLA','CASA INDIPENDENTE','BIFAMILIARE',
      'RUSTICO','TERRENO','NEGOZIO','LOCALE COMMERCIALE','CAPANNONE','ALTRO'
    ) then raise exception 'TIPO IMMOBILE NON VALIDO'; end if;
  end if;

  update public.f1_territory_civic_records
  set property_type=case when p_property_type is null then property_type else nullif(v_type,'') end,
      signals=case when p_signals is null then signals else p_signals end,
      updated_at=now()
  where civic_record_id=p_civic_record_id
    and user_id=auth.uid()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.f1_territory_conversation_add_record_v3(
  p_civic_record_id uuid,
  p_target_type text,
  p_person_name text default '',
  p_phone text default '',
  p_outcome text default '',
  p_notes text default '',
  p_lead_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_civic public.f1_territory_civic_records%rowtype;
  v_progress public.f1_territory_progress%rowtype;
  v_row public.f1_territory_conversations%rowtype;
  v_obs public.f1_territory_observations%rowtype;
  v_out text:=upper(trim(coalesce(p_outcome,'')));
  v_next text:='';
  v_status text:='REGISTRATA';
  v_news boolean:=false;
  v_workflow text:='DA_VERIFICARE';
begin
  if trim(coalesce(p_target_type,''))='' then raise exception 'INDICA CON CHI HAI PARLATO'; end if;
  if v_out='' then raise exception 'INDICA COME È ANDATA'; end if;

  select * into v_civic
  from public.f1_territory_civic_records
  where civic_record_id=p_civic_record_id
    and user_id=auth.uid();
  if not found then raise exception 'IMMOBILE / CIVICO NON MODIFICABILE'; end if;

  select * into v_progress
  from public.f1_territory_progress
  where progress_id=v_civic.progress_id
    and user_id=auth.uid();

  case v_out
    when 'NESSUNA INFORMAZIONE' then v_next:='PROSEGUI TERRITORIO';
    when 'INFORMAZIONE UTILE' then v_next:='VERIFICA NOTIZIA';v_news:=true;
    when 'POSSIBILE VENDITA' then v_next:='QUALIFICA VENDITORE';v_status:='DA_QUALIFICARE';v_workflow:='DA_QUALIFICARE';v_news:=true;
    when 'DA RICONTATTARE' then v_next:='PROGRAMMA RICHIAMO';v_status:='RICHIAMO';
    when 'APPUNTAMENTO' then v_next:='PREPARA APPUNTAMENTO';v_status:='APPUNTAMENTO';v_workflow:='APPUNTAMENTO';v_news:=true;
    else v_next:='VERIFICA NOTA';v_status:='DA_VERIFICARE';
  end case;

  insert into public.f1_territory_conversations(
    user_id,civic_record_id,progress_id,session_id,target_type,person_name,phone,outcome,notes,lead_id,status,next_action
  ) values (
    auth.uid(),v_civic.civic_record_id,v_civic.progress_id,v_civic.session_id,
    upper(trim(p_target_type)),trim(coalesce(p_person_name,'')),trim(coalesce(p_phone,'')),
    v_out,trim(coalesce(p_notes,'')),nullif(trim(coalesce(p_lead_id,'')),''),
    v_status,v_next
  )
  returning * into v_row;

  update public.f1_territory_civic_records
  set next_action=v_next,updated_at=now()
  where civic_record_id=v_civic.civic_record_id
    and user_id=auth.uid();

  if v_civic.session_id is not null then
    update public.f1_territory_sessions
    set nuovi_contatti=nuovi_contatti+1,
        richiami_generati=richiami_generati+case when v_out='DA RICONTATTARE' then 1 else 0 end,
        appuntamenti=appuntamenti+case when v_out='APPUNTAMENTO' then 1 else 0 end
    where id=v_civic.session_id and user_id=auth.uid();
  end if;

  if v_news then
    insert into public.f1_territory_observations(
      user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,
      detail,source,person_name,notes,status,workflow_state,next_action,priority,
      updated_by,assigned_context,office_status,phone_normalized
    ) values (
      auth.uid(),v_civic.progress_id,v_civic.session_id,'NOTIZIA_IMMOBILIARE',v_out,
      v_civic.comune,v_civic.zona,v_civic.via,v_civic.civico,
      coalesce(nullif(trim(p_notes),''),v_out||' emersa durante conversazione.'),
      upper(trim(p_target_type)),trim(coalesce(p_person_name,'')),'CONVERSAZIONE TERRITORIALE',
      case when v_out='APPUNTAMENTO' then 'APPUNTAMENTO' else 'DA_INSERIRE_CRM' end,
      v_workflow,v_next,'ALTA',auth.uid(),'OFFICE','DA_LAVORARE',trim(coalesce(p_phone,''))
    )
    returning * into v_obs;

    if v_civic.session_id is not null then
      update public.f1_territory_sessions
      set nuove_notizie=nuove_notizie+1
      where id=v_civic.session_id and user_id=auth.uid();
    end if;
  end if;

  return jsonb_build_object(
    'conversation',to_jsonb(v_row),
    'news',case when v_obs.observation_id is null then null else to_jsonb(v_obs) end
  );
end;
$$;

create or replace function public.f1_territory_letter_create_record_v3(p_civic_record_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_civic public.f1_territory_civic_records%rowtype;
  v_profile public.f1_staff_profiles%rowtype;
  v_letter public.f1_territory_letters%rowtype;
  v_name text;
  v_phone text;
  v_address text;
begin
  select * into v_civic
  from public.f1_territory_civic_records
  where civic_record_id=p_civic_record_id
    and user_id=auth.uid();
  if not found then raise exception 'IMMOBILE / CIVICO NON MODIFICABILE'; end if;

  select * into v_profile
  from public.f1_staff_profiles
  where user_id=auth.uid() and status='ACTIVE'
  limit 1;

  v_name:=trim(concat_ws(' ',v_profile.first_name,v_profile.last_name));
  if upper(trim(coalesce(v_profile.role,'')))='TITOLARE'
     and lower(v_name) in ('titolare f1 immobiliare','titolare') then
    v_name:='Joseph';
  end if;
  v_phone:=trim(coalesce(v_profile.phone,''));
  if v_phone='' and lower(v_name)='joseph' then v_phone:='3713708294'; end if;

  v_address:=trim(concat_ws(' ',v_civic.via,v_civic.civico))||', '||trim(v_civic.comune);

  insert into public.f1_territory_letters(
    user_id,civic_record_id,progress_id,comune,via,civico,
    operator_name,operator_phone,address_text,address_source,status
  ) values (
    auth.uid(),v_civic.civic_record_id,v_civic.progress_id,v_civic.comune,v_civic.via,v_civic.civico,
    v_name,v_phone,v_address,'CRM','DA_STAMPARE'
  )
  on conflict(user_id,civic_record_id) do update
  set operator_name=excluded.operator_name,
      operator_phone=excluded.operator_phone,
      address_text=case
        when public.f1_territory_letters.address_verified_at is null then excluded.address_text
        else public.f1_territory_letters.address_text
      end,
      updated_at=now()
  returning * into v_letter;

  return to_jsonb(v_letter);
end;
$$;

revoke execute on function public.f1_territory_civic_patch_record_v3(uuid,text,text[]) from public, anon;
revoke execute on function public.f1_territory_conversation_add_record_v3(uuid,text,text,text,text,text,text) from public, anon;
revoke execute on function public.f1_territory_letter_create_record_v3(uuid) from public, anon;

grant execute on function public.f1_territory_civic_patch_record_v3(uuid,text,text[]) to authenticated;
grant execute on function public.f1_territory_conversation_add_record_v3(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.f1_territory_letter_create_record_v3(uuid) to authenticated;
