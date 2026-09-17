alter table public.f1_territory_observations
  add column if not exists owner_status text not null default 'DA_VERIFICARE',
  add column if not exists market_publisher text not null default '',
  add column if not exists market_price text not null default '',
  add column if not exists market_agency text not null default '',
  add column if not exists market_time_on_market text not null default '',
  add column if not exists market_source_url text not null default '',
  add column if not exists market_source_observed_at timestamptz,
  add column if not exists seller_qualification jsonb not null default '{}'::jsonb,
  add column if not exists resolved_at timestamptz;

create table if not exists public.f1_territory_civic_records (
  civic_record_id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  progress_id uuid not null references public.f1_territory_progress(progress_id) on delete cascade,
  session_id uuid references public.f1_territory_sessions(id) on delete set null,
  comune text not null default '', zona text not null default '', via text not null default '', civico text not null default '',
  record_type text not null default 'SCHEDA_IMMOBILE', property_type text not null default '', signals text[] not null default '{}'::text[],
  status text not null default 'IN_CORSO', next_action text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,progress_id,via,civico)
);

create table if not exists public.f1_territory_conversations (
  conversation_id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  civic_record_id uuid not null references public.f1_territory_civic_records(civic_record_id) on delete cascade,
  progress_id uuid not null references public.f1_territory_progress(progress_id) on delete cascade,
  session_id uuid references public.f1_territory_sessions(id) on delete set null,
  target_type text not null default '', person_name text not null default '', phone text not null default '', outcome text not null default '', notes text not null default '',
  lead_id text, status text not null default 'REGISTRATA', next_action text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.f1_territory_letters (
  letter_id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  civic_record_id uuid not null references public.f1_territory_civic_records(civic_record_id) on delete cascade,
  progress_id uuid references public.f1_territory_progress(progress_id) on delete set null, property_id text,
  comune text not null default '', via text not null default '', civico text not null default '', operator_name text not null default '', operator_phone text not null default '',
  address_text text not null default '', address_source text not null default 'CRM', address_verified_at timestamptz,
  status text not null default 'DA_STAMPARE', previewed_at timestamptz, printed_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,civic_record_id)
);

create table if not exists public.f1_territory_zone_runs (
  zone_run_id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  progress_id uuid references public.f1_territory_progress(progress_id) on delete set null,
  source_property_address text not null, campaign_type text not null default 'ZONE_LEVERAGE', flyers_printed integer not null default 30,
  target_civics integer not null default 30, status text not null default 'IN_CORSO', started_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists f1_territory_civic_records_address_idx on public.f1_territory_civic_records(comune,via,civico,updated_at desc);
create index if not exists f1_territory_conversations_civic_idx on public.f1_territory_conversations(civic_record_id,created_at desc);
create index if not exists f1_territory_letters_status_idx on public.f1_territory_letters(status,via,civico,created_at desc);
create index if not exists f1_territory_news_office_v2_idx on public.f1_territory_observations(office_status,observed_at desc) where observation_type='NOTIZIA_IMMOBILIARE';

alter table public.f1_territory_civic_records enable row level security;
alter table public.f1_territory_conversations enable row level security;
alter table public.f1_territory_letters enable row level security;
alter table public.f1_territory_zone_runs enable row level security;

drop policy if exists f1_territory_civic_records_select on public.f1_territory_civic_records;
create policy f1_territory_civic_records_select on public.f1_territory_civic_records for select to authenticated using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_civic_records_insert on public.f1_territory_civic_records;
create policy f1_territory_civic_records_insert on public.f1_territory_civic_records for insert to authenticated with check (user_id=auth.uid());
drop policy if exists f1_territory_civic_records_update on public.f1_territory_civic_records;
create policy f1_territory_civic_records_update on public.f1_territory_civic_records for update to authenticated using (f1_private.can_access_user(user_id)) with check (f1_private.can_access_user(user_id));

drop policy if exists f1_territory_conversations_select on public.f1_territory_conversations;
create policy f1_territory_conversations_select on public.f1_territory_conversations for select to authenticated using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_conversations_insert on public.f1_territory_conversations;
create policy f1_territory_conversations_insert on public.f1_territory_conversations for insert to authenticated with check (user_id=auth.uid());
drop policy if exists f1_territory_conversations_update on public.f1_territory_conversations;
create policy f1_territory_conversations_update on public.f1_territory_conversations for update to authenticated using (f1_private.can_access_user(user_id)) with check (f1_private.can_access_user(user_id));

drop policy if exists f1_territory_letters_select on public.f1_territory_letters;
create policy f1_territory_letters_select on public.f1_territory_letters for select to authenticated using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_letters_insert on public.f1_territory_letters;
create policy f1_territory_letters_insert on public.f1_territory_letters for insert to authenticated with check (user_id=auth.uid());
drop policy if exists f1_territory_letters_update on public.f1_territory_letters;
create policy f1_territory_letters_update on public.f1_territory_letters for update to authenticated using (f1_private.can_access_user(user_id)) with check (f1_private.can_access_user(user_id));

drop policy if exists f1_territory_zone_runs_select on public.f1_territory_zone_runs;
create policy f1_territory_zone_runs_select on public.f1_territory_zone_runs for select to authenticated using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_zone_runs_insert on public.f1_territory_zone_runs;
create policy f1_territory_zone_runs_insert on public.f1_territory_zone_runs for insert to authenticated with check (user_id=auth.uid());
drop policy if exists f1_territory_zone_runs_update on public.f1_territory_zone_runs;
create policy f1_territory_zone_runs_update on public.f1_territory_zone_runs for update to authenticated using (f1_private.can_access_user(user_id)) with check (f1_private.can_access_user(user_id));

create or replace function public.f1_territory_ensure_civic_v2(p_progress_id uuid,p_civico text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_progress public.f1_territory_progress%rowtype; v_id uuid; v_civico text:=trim(coalesce(p_civico,''));
begin
  if v_civico='' then raise exception 'CIVICO OBBLIGATORIO'; end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  if trim(coalesce(v_progress.next_civic,''))<>'' and trim(v_progress.next_civic)<>v_civico then raise exception 'CIVICO % NON CORRISPONDE AL GIRO ATTIVO (%).',v_civico,v_progress.next_civic; end if;
  insert into public.f1_territory_civic_records(user_id,progress_id,session_id,comune,zona,via,civico)
  values(auth.uid(),v_progress.progress_id,v_progress.session_id,v_progress.comune,v_progress.zona,v_progress.via,v_civico)
  on conflict(user_id,progress_id,via,civico) do update set updated_at=now() returning civic_record_id into v_id;
  return v_id;
end;$$;

create or replace function public.f1_territory_civic_update_v2(p_progress_id uuid,p_civico text,p_property_type text default null,p_signal text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid;v_signal text:=upper(trim(coalesce(p_signal,'')));v_type text:=upper(trim(coalesce(p_property_type,'')));v_row public.f1_territory_civic_records%rowtype;v_progress public.f1_territory_progress%rowtype;v_obs public.f1_territory_observations%rowtype;v_next text;v_news boolean:=false;
begin
  v_id:=public.f1_territory_ensure_civic_v2(p_progress_id,p_civico);
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  if v_type<>'' then update public.f1_territory_civic_records set property_type=v_type,updated_at=now() where civic_record_id=v_id; end if;
  if v_signal<>'' then
    if v_signal='NESSUN SEGNALE' then update public.f1_territory_civic_records set signals=array['NESSUN SEGNALE']::text[],updated_at=now() where civic_record_id=v_id;
    else update public.f1_territory_civic_records set signals=(select coalesce(array_agg(x order by ord),'{}'::text[]) from (select distinct on (x) x,ord from unnest(array_remove(signals,'NESSUN SEGNALE')||array[v_signal]) with ordinality t(x,ord) order by x,ord) q),updated_at=now() where civic_record_id=v_id; end if;
    v_news:=v_signal=any(array['IMMOBILE GIÀ SUL MERCATO','CARTELLO VENDITA','CARTELLO AFFITTO','LAVORI','CANTIERE','RISTRUTTURAZIONE','NUOVA COSTRUZIONE','POSSIBILE IMMOBILE NON UTILIZZATO']);
    if v_news and not exists(select 1 from public.f1_territory_observations where user_id=auth.uid() and progress_id=p_progress_id and via=v_progress.via and civico=trim(p_civico) and news_type=v_signal and coalesce(status,'')<>'CHIUSA' limit 1) then
      v_next:=case when v_signal=any(array['IMMOBILE GIÀ SUL MERCATO','CARTELLO VENDITA','CARTELLO AFFITTO']) then 'RICERCA BACKGROUND MERCATO' else 'VERIFICA NOTIZIA' end;
      insert into public.f1_territory_observations(user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,notes,status,workflow_state,next_action,priority,updated_by,assigned_context,office_status)
      values(auth.uid(),v_progress.progress_id,v_progress.session_id,'NOTIZIA_IMMOBILIARE',v_signal,v_progress.comune,v_progress.zona,v_progress.via,trim(p_civico),v_signal||' osservato al civico '||trim(p_civico)||'.','OSSERVAZIONE DIRETTA','SALVATO AUTOMATICAMENTE DAL TERRITORIO','DA_INSERIRE_CRM','DA_VERIFICARE',v_next,'ALTA',auth.uid(),'OFFICE','DA_LAVORARE') returning * into v_obs;
      if v_progress.session_id is not null then update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
    end if;
  end if;
  select * into v_row from public.f1_territory_civic_records where civic_record_id=v_id;
  return jsonb_build_object('civic',to_jsonb(v_row),'news',case when v_obs.observation_id is null then null else to_jsonb(v_obs) end);
end;$$;

create or replace function public.f1_territory_conversation_add_v2(p_progress_id uuid,p_civico text,p_target_type text,p_person_name text default '',p_phone text default '',p_outcome text default '',p_notes text default '',p_lead_id text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_civic uuid;v_progress public.f1_territory_progress%rowtype;v_row public.f1_territory_conversations%rowtype;v_obs public.f1_territory_observations%rowtype;v_out text:=upper(trim(coalesce(p_outcome,'')));v_next text:='';v_status text:='REGISTRATA';v_news boolean:=false;v_workflow text:='DA_VERIFICARE';
begin
  if trim(coalesce(p_target_type,''))='' then raise exception 'INDICA CON CHI HAI PARLATO'; end if; if v_out='' then raise exception 'INDICA COME È ANDATA'; end if;
  v_civic:=public.f1_territory_ensure_civic_v2(p_progress_id,p_civico); select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  case v_out when 'NESSUNA INFORMAZIONE' then v_next:='PROSEGUI TERRITORIO'; when 'INFORMAZIONE UTILE' then v_next:='VERIFICA NOTIZIA';v_news:=true; when 'POSSIBILE VENDITA' then v_next:='QUALIFICA VENDITORE';v_status:='DA_QUALIFICARE';v_workflow:='DA_QUALIFICARE';v_news:=true; when 'DA RICONTATTARE' then v_next:='PROGRAMMA RICHIAMO';v_status:='RICHIAMO'; when 'APPUNTAMENTO' then v_next:='PREPARA APPUNTAMENTO';v_status:='APPUNTAMENTO';v_workflow:='APPUNTAMENTO';v_news:=true; else v_next:='VERIFICA NOTA';v_status:='DA_VERIFICARE'; end case;
  insert into public.f1_territory_conversations(user_id,civic_record_id,progress_id,session_id,target_type,person_name,phone,outcome,notes,lead_id,status,next_action)
  values(auth.uid(),v_civic,p_progress_id,v_progress.session_id,upper(trim(p_target_type)),trim(coalesce(p_person_name,'')),trim(coalesce(p_phone,'')),v_out,trim(coalesce(p_notes,'')),nullif(trim(coalesce(p_lead_id,'')),''),v_status,v_next) returning * into v_row;
  update public.f1_territory_civic_records set next_action=v_next,updated_at=now() where civic_record_id=v_civic;
  if v_progress.session_id is not null then update public.f1_territory_sessions set nuovi_contatti=nuovi_contatti+1,richiami_generati=richiami_generati+case when v_out='DA RICONTATTARE' then 1 else 0 end,appuntamenti=appuntamenti+case when v_out='APPUNTAMENTO' then 1 else 0 end where id=v_progress.session_id and user_id=auth.uid(); end if;
  if v_news then
    insert into public.f1_territory_observations(user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,person_name,notes,status,workflow_state,next_action,priority,updated_by,assigned_context,office_status,phone_normalized)
    values(auth.uid(),p_progress_id,v_progress.session_id,'NOTIZIA_IMMOBILIARE',v_out,v_progress.comune,v_progress.zona,v_progress.via,trim(p_civico),coalesce(nullif(trim(p_notes),''),v_out||' emersa durante conversazione.'),upper(trim(p_target_type)),trim(coalesce(p_person_name,'')),'CONVERSAZIONE TERRITORIALE',case when v_out='APPUNTAMENTO' then 'APPUNTAMENTO' else 'DA_INSERIRE_CRM' end,v_workflow,v_next,'ALTA',auth.uid(),'OFFICE','DA_LAVORARE',trim(coalesce(p_phone,''))) returning * into v_obs;
    if v_progress.session_id is not null then update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
  end if;
  return jsonb_build_object('conversation',to_jsonb(v_row),'news',case when v_obs.observation_id is null then null else to_jsonb(v_obs) end);
end;$$;

create or replace function public.f1_territory_news_update_v2(p_observation_id uuid,p_person_name text default '',p_phone text default '',p_detail text default '',p_owner_status text default 'DA_VERIFICARE',p_market_publisher text default '',p_market_price text default '',p_market_agency text default '',p_market_time_on_market text default '',p_market_source_url text default '',p_seller_qualification jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_obs public.f1_territory_observations%rowtype;v_pub text:=upper(trim(coalesce(p_market_publisher,'')));v_phone text:=trim(coalesce(p_phone,''));v_next text;v_workflow text;v_status text;v_source text;
begin
  select * into v_obs from public.f1_territory_observations where observation_id=p_observation_id and f1_private.can_access_user(user_id) for update; if not found then raise exception 'NOTIZIA NON DISPONIBILE'; end if;
  v_next:=coalesce(nullif(v_obs.next_action,''),'VERIFICA NOTIZIA');v_workflow:=coalesce(nullif(v_obs.workflow_state,''),'DA_VERIFICARE');v_status:=coalesce(nullif(v_obs.status,''),'DA_INSERIRE_CRM');v_source:=v_obs.source;
  if v_pub='PRIVATO' then v_workflow:='FSBO';v_status:=case when v_phone<>'' then 'DA_CONTATTARE' else 'DA_VERIFICARE' end;v_next:=case when v_phone<>'' then 'CONTATTARE FSBO ORA' else 'IDENTIFICARE PROPRIETARIO / REPERIRE CONTATTO' end;v_source:='FSBO / PRIVATO'; elsif v_pub='AGENZIA' then v_workflow:='AGENZIA';v_status:='DA_VERIFICARE';v_next:='VERIFICA NOTIZIA';v_source:='AGENZIA'; end if;
  update public.f1_territory_observations set person_name=trim(coalesce(p_person_name,'')),phone_normalized=v_phone,detail=coalesce(nullif(trim(coalesce(p_detail,'')),''),detail),owner_status=upper(trim(coalesce(p_owner_status,'DA_VERIFICARE'))),market_publisher=v_pub,market_price=trim(coalesce(p_market_price,'')),market_agency=trim(coalesce(p_market_agency,'')),market_time_on_market=trim(coalesce(p_market_time_on_market,'')),market_source_url=trim(coalesce(p_market_source_url,'')),market_source_observed_at=case when trim(coalesce(p_market_source_url,''))<>'' then now() else market_source_observed_at end,seller_qualification=coalesce(p_seller_qualification,'{}'::jsonb),workflow_state=v_workflow,status=v_status,next_action=v_next,source=v_source,priority=case when v_pub='PRIVATO' then 'ALTA' else priority end,assigned_context='OFFICE',office_status=case when office_status='' then 'DA_LAVORARE' else office_status end,updated_at=now(),updated_by=auth.uid(),version=version+1 where observation_id=p_observation_id returning * into v_obs;
  return to_jsonb(v_obs);
end;$$;

create or replace function public.f1_territory_news_resolve_v2(p_observation_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_obs public.f1_territory_observations%rowtype;
begin update public.f1_territory_observations set status='CHIUSA',workflow_state='CHIUSA',next_action='NESSUNA AZIONE',office_status='RISOLTA',resolved_at=now(),last_office_action_at=now(),last_office_action_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),version=version+1 where observation_id=p_observation_id and f1_private.can_access_user(user_id) returning * into v_obs; if not found then raise exception 'NOTIZIA NON DISPONIBILE'; end if; return to_jsonb(v_obs); end;$$;

create or replace function public.f1_territory_letter_create_v2(p_progress_id uuid,p_civico text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_progress public.f1_territory_progress%rowtype;v_civic uuid;v_profile public.f1_staff_profiles%rowtype;v_letter public.f1_territory_letters%rowtype;v_name text;v_phone text;v_address text;
begin
  v_civic:=public.f1_territory_ensure_civic_v2(p_progress_id,p_civico); select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid(); select * into v_profile from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE' limit 1;
  v_name:=trim(concat_ws(' ',v_profile.first_name,v_profile.last_name)); if upper(trim(coalesce(v_profile.role,'')))='TITOLARE' and lower(v_name) in ('titolare f1 immobiliare','titolare') then v_name:='Joseph'; end if; v_phone:=trim(coalesce(v_profile.phone,'')); if v_phone='' and lower(v_name)='joseph' then v_phone:='3713708294'; end if;
  v_address:=trim(concat_ws(' ',v_progress.via,trim(p_civico)))||', '||trim(v_progress.comune);
  insert into public.f1_territory_letters(user_id,civic_record_id,progress_id,comune,via,civico,operator_name,operator_phone,address_text,address_source,status)
  values(auth.uid(),v_civic,p_progress_id,v_progress.comune,v_progress.via,trim(p_civico),v_name,v_phone,v_address,'CRM','DA_STAMPARE')
  on conflict(user_id,civic_record_id) do update set operator_name=excluded.operator_name,operator_phone=excluded.operator_phone,address_text=case when public.f1_territory_letters.address_verified_at is null then excluded.address_text else public.f1_territory_letters.address_text end,updated_at=now() returning * into v_letter;
  return to_jsonb(v_letter);
end;$$;

create or replace function public.f1_territory_letter_update_v2(p_letter_id uuid,p_status text default null,p_address_text text default null,p_address_source text default null,p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_letter public.f1_territory_letters%rowtype;v_status text:=upper(trim(coalesce(p_status,'')));
begin
  select * into v_letter from public.f1_territory_letters where letter_id=p_letter_id and f1_private.can_access_user(user_id) for update; if not found then raise exception 'LETTERA NON DISPONIBILE'; end if; if v_status<>'' and v_status not in ('DA_STAMPARE','DA_IMBUCARE','IMBUCATA') then raise exception 'STATO LETTERA NON VALIDO'; end if;
  update public.f1_territory_letters set status=case when v_status='' then status else v_status end,address_text=case when trim(coalesce(p_address_text,''))='' then address_text else trim(p_address_text) end,address_source=case when trim(coalesce(p_address_source,''))='' then address_source else trim(p_address_source) end,address_verified_at=case when p_verified then now() else address_verified_at end,previewed_at=case when v_status='DA_IMBUCARE' and previewed_at is null then now() else previewed_at end,printed_at=case when v_status='DA_IMBUCARE' and printed_at is null then now() else printed_at end,delivered_at=case when v_status='IMBUCATA' then now() else delivered_at end,updated_at=now() where letter_id=p_letter_id returning * into v_letter;
  return to_jsonb(v_letter);
end;$$;

create or replace function public.f1_territory_zone_run_start_v2(p_progress_id uuid,p_source_property_address text,p_campaign_type text default 'ZONE_LEVERAGE',p_flyers_printed integer default 30)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_row public.f1_territory_zone_runs%rowtype;
begin
  if trim(coalesce(p_source_property_address,''))='' then raise exception 'INDIRIZZO IMMOBILE OBBLIGATORIO'; end if; if coalesce(p_flyers_printed,0)<30 then raise exception 'PRIMA STAMPA 30 VOLANTINI'; end if; if p_progress_id is not null and not exists(select 1 from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid()) then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  insert into public.f1_territory_zone_runs(user_id,progress_id,source_property_address,campaign_type,flyers_printed,target_civics,status) values(auth.uid(),p_progress_id,trim(p_source_property_address),upper(trim(coalesce(p_campaign_type,'ZONE_LEVERAGE'))),p_flyers_printed,30,'IN_CORSO') returning * into v_row; return to_jsonb(v_row);
end;$$;

create or replace function public.f1_territory_mobile_crm_v2(p_limit integer default 500)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_limit integer:=greatest(1,least(coalesce(p_limit,500),1000));
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  return jsonb_build_object(
    'civics',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (select * from public.f1_territory_civic_records c where f1_private.can_access_user(c.user_id) order by c.updated_at desc limit v_limit) x),'[]'::jsonb),
    'conversations',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select c.*,r.comune,r.zona,r.via,r.civico from public.f1_territory_conversations c join public.f1_territory_civic_records r on r.civic_record_id=c.civic_record_id where f1_private.can_access_user(c.user_id) order by c.created_at desc limit v_limit) x),'[]'::jsonb),
    'news',coalesce((select jsonb_agg(to_jsonb(x) order by x.observed_at desc) from (select o.* from public.f1_territory_observations o where f1_private.can_access_user(o.user_id) and o.observation_type in ('NOTIZIA_IMMOBILIARE','CARTELLO_IMMOBILIARE') order by o.observed_at desc limit v_limit) x),'[]'::jsonb),
    'letters',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.f1_territory_letters l where f1_private.can_access_user(l.user_id) order by l.created_at desc limit v_limit) x),'[]'::jsonb),
    'territory_leads',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (select lead_id,user_id,nome,cognome,azienda,telefono,email,comune,via,civico,zona,source_type,source,lead_reason,status,next_action,next_action_date,notes,updated_at from public.leads l where f1_private.can_access_user(l.user_id) and coalesce(l.deleted,false)=false and (upper(coalesce(l.source_type,''))='TERRITORY' or upper(coalesce(l.source,'')) like '%TERRITOR%') order by l.updated_at desc limit v_limit) x),'[]'::jsonb),
    'zone_runs',coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (select * from public.f1_territory_zone_runs z where f1_private.can_access_user(z.user_id) order by z.started_at desc limit 100) x),'[]'::jsonb),
    'open_news_count',(select count(*) from public.f1_territory_observations o where f1_private.can_access_user(o.user_id) and o.observation_type in ('NOTIZIA_IMMOBILIARE','CARTELLO_IMMOBILIARE') and coalesce(o.status,'')<>'CHIUSA' and coalesce(o.office_status,'')<>'RISOLTA'),
    'letters_to_print_count',(select count(*) from public.f1_territory_letters l where f1_private.can_access_user(l.user_id) and l.status='DA_STAMPARE'),
    'letters_to_deliver_count',(select count(*) from public.f1_territory_letters l where f1_private.can_access_user(l.user_id) and l.status='DA_IMBUCARE')
  );
end;$$;

revoke all on function public.f1_territory_ensure_civic_v2(uuid,text) from public,anon;
revoke all on function public.f1_territory_civic_update_v2(uuid,text,text,text) from public,anon;
revoke all on function public.f1_territory_conversation_add_v2(uuid,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.f1_territory_news_update_v2(uuid,text,text,text,text,text,text,text,text,text,jsonb) from public,anon;
revoke all on function public.f1_territory_news_resolve_v2(uuid) from public,anon;
revoke all on function public.f1_territory_letter_create_v2(uuid,text) from public,anon;
revoke all on function public.f1_territory_letter_update_v2(uuid,text,text,text,boolean) from public,anon;
revoke all on function public.f1_territory_zone_run_start_v2(uuid,text,text,integer) from public,anon;
revoke all on function public.f1_territory_mobile_crm_v2(integer) from public,anon;
grant execute on function public.f1_territory_ensure_civic_v2(uuid,text) to authenticated;
grant execute on function public.f1_territory_civic_update_v2(uuid,text,text,text) to authenticated;
grant execute on function public.f1_territory_conversation_add_v2(uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.f1_territory_news_update_v2(uuid,text,text,text,text,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.f1_territory_news_resolve_v2(uuid) to authenticated;
grant execute on function public.f1_territory_letter_create_v2(uuid,text) to authenticated;
grant execute on function public.f1_territory_letter_update_v2(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.f1_territory_zone_run_start_v2(uuid,text,text,integer) to authenticated;
grant execute on function public.f1_territory_mobile_crm_v2(integer) to authenticated;
