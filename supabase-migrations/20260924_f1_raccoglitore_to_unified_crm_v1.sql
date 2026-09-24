-- F1 Raccoglitore mobile -> CRM unificato
-- Applicata a Supabase il 24/09/2026.
-- Ogni record del Raccoglitore viene materializzato in public.leads.
-- Gli eventuali ricontatti con data vengono materializzati in public.tasks.

create or replace function f1_private.sync_raccoglitore_record_to_crm_v1(p_record_id text)
returns text
language plpgsql
security definer
set search_path to 'public','f1_private','pg_temp'
as $function$
declare
  r public.f1_raccoglitore_records%rowtype;
  v_user uuid;
  v_lead_id text;
  v_status text;
  v_notes text;
  v_due timestamptz;
  v_time time;
  v_priority smallint;
  v_task_rows integer := 0;
begin
  select * into r
  from public.f1_raccoglitore_records
  where record_id=p_record_id;

  if not found then return null; end if;

  v_user := coalesce(
    auth.uid(),
    (
      select user_id
      from public.f1_staff_profiles
      where upper(coalesce(role,''))='TITOLARE'
        and upper(coalesce(status,''))='ACTIVE'
      order by created_at asc
      limit 1
    )
  );

  if v_user is null then raise exception 'TITOLARE F1 NON CONFIGURATO'; end if;

  v_lead_id := 'RACC:' || r.record_id;
  v_status := upper(regexp_replace(trim(coalesce(r.stato,'')), '\s+', '_', 'g'));
  if v_status='' then v_status:='DA_VERIFICARE'; end if;

  v_notes := concat_ws(' · ',
    'RACCOGLITORE MOBILE',
    nullif('Tipo: ' || coalesce(r.record_type,''),'Tipo: '),
    case when nullif(trim(coalesce(r.payload->>'categoria','')),'') is not null then 'Categoria: ' || trim(r.payload->>'categoria') end,
    case when nullif(trim(coalesce(r.payload->>'tipologia','')),'') is not null then 'Tipologia: ' || trim(r.payload->>'tipologia') end,
    case when nullif(trim(coalesce(r.payload->>'prezzo','')),'') is not null then 'Prezzo: ' || trim(r.payload->>'prezzo') end,
    case when nullif(trim(coalesce(r.payload->>'motivazione','')),'') is not null then 'Motivazione: ' || trim(r.payload->>'motivazione') end,
    case when nullif(trim(coalesce(r.payload->>'tempistica','')),'') is not null then 'Tempistica: ' || trim(r.payload->>'tempistica') end,
    case when nullif(trim(coalesce(r.payload->>'priorita','')),'') is not null then 'Priorità: ' || trim(r.payload->>'priorita') end,
    case when nullif(trim(coalesce(r.payload->>'attendibilita','')),'') is not null then 'Attendibilità: ' || trim(r.payload->>'attendibilita') end,
    case when nullif(trim(coalesce(r.payload->>'fonte','')),'') is not null then 'Fonte: ' || trim(r.payload->>'fonte') end,
    case when nullif(trim(coalesce(r.payload->>'origine','')),'') is not null then 'Origine: ' || trim(r.payload->>'origine') end,
    case when nullif(trim(coalesce(r.payload->>'segnali','')),'') is not null then 'Segnali: ' || trim(r.payload->>'segnali') end,
    case when nullif(trim(coalesce(r.payload->>'note','')),'') is not null then trim(r.payload->>'note') end
  );

  insert into public.leads(
    lead_id,user_id,pillar,source_type,source,source_url,
    created_at,first_seen,last_seen,
    nome,cognome,azienda,telefono,email,comune,via,civico,zona,
    immobile_id,competitor_agency,lead_reason,lead_score,confidence,status,
    last_contact,next_action,next_action_date,assigned_to,notes,
    privacy_basis,do_not_contact,rpo_status,created_by,updated_at,deleted,
    created_by_user_id,last_modified_by_user_id,assigned_user_id,market_data
  )
  values(
    v_lead_id,v_user,1,'TERRITORY','F1 TERRITORY · RACCOGLITORE MOBILE',
    coalesce(r.payload->>'url',''),
    coalesce(r.data_inserimento,r.created_at,now()),
    coalesce(r.data_inserimento,r.created_at,now()),
    coalesce(r.aggiornato,r.updated_at,now()),
    coalesce(r.payload->>'nome',''),
    coalesce(r.payload->>'cognome',''),
    '',
    coalesce(r.payload->>'telefono',''),
    coalesce(r.payload->>'email',''),
    coalesce(r.payload->>'comune',r.comune,''),
    coalesce(r.payload->>'via',''),
    coalesce(r.payload->>'civico',''),
    coalesce(r.payload->>'zona',''),
    '',
    '',
    'RACCOGLITORE MOBILE · ' || coalesce(r.record_type,'DATO'),
    50,
    'MEDIUM',
    v_status,
    null,
    coalesce(r.payload->>'prossimaAzione',''),
    case when r.data_azione is null then null
         else (r.data_azione + time '09:00') at time zone 'Europe/Rome' end,
    '',
    coalesce(v_notes,'RACCOGLITORE MOBILE'),
    'F1_RACCOGLITORE_OPERATIVO',
    false,
    case when nullif(regexp_replace(coalesce(r.payload->>'telefono',''),'\D','','g'),'') is null
         then 'NON_APPLICABILE' else 'DA_VERIFICARE' end,
    'f1_raccoglitore_sync',
    coalesce(r.aggiornato,r.updated_at,now()),
    false,
    v_user,v_user,null,
    jsonb_build_object(
      'raccoglitore_record_id',r.record_id,
      'raccoglitore_record_type',r.record_type,
      'raccoglitore_payload',r.payload,
      'raccoglitore_synced_at',now()
    )
  )
  on conflict(lead_id) do update set
    user_id=excluded.user_id,
    pillar=excluded.pillar,
    source_type=excluded.source_type,
    source=excluded.source,
    source_url=excluded.source_url,
    first_seen=coalesce(public.leads.first_seen,excluded.first_seen),
    last_seen=excluded.last_seen,
    nome=excluded.nome,
    cognome=excluded.cognome,
    telefono=excluded.telefono,
    email=excluded.email,
    comune=excluded.comune,
    via=excluded.via,
    civico=excluded.civico,
    zona=excluded.zona,
    lead_reason=excluded.lead_reason,
    lead_score=excluded.lead_score,
    confidence=excluded.confidence,
    status=excluded.status,
    next_action=excluded.next_action,
    next_action_date=excluded.next_action_date,
    notes=excluded.notes,
    privacy_basis=excluded.privacy_basis,
    do_not_contact=excluded.do_not_contact,
    rpo_status=excluded.rpo_status,
    created_by=excluded.created_by,
    updated_at=excluded.updated_at,
    deleted=false,
    last_modified_by_user_id=excluded.last_modified_by_user_id,
    market_data=coalesce(public.leads.market_data,'{}'::jsonb) || excluded.market_data;

  if r.data_azione is not null
     and upper(coalesce(r.stato,'')) not in ('VENDUTO','ARCHIVIATO','NON INTERESSATO','NON_INTERESSATO') then

    if coalesce(r.payload->>'oraAzione','') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then
      v_time := (r.payload->>'oraAzione')::time;
    else
      v_time := time '09:00';
    end if;

    v_due := (r.data_azione + v_time) at time zone 'Europe/Rome';
    v_priority := case upper(trim(coalesce(r.payload->>'priorita','')))
      when 'URGENTE' then 100
      when 'ALTA' then 90
      when 'MEDIA' then 60
      when 'BASSA' then 30
      else 50
    end;

    update public.tasks
    set lead_id=v_lead_id,
        property_id='',
        pillar=1,
        task_type='FOLLOW_UP',
        reason=coalesce(nullif(trim(r.payload->>'prossimaAzione'),''),'Ricontatto da Raccoglitore mobile'),
        priority=v_priority,
        due_date=v_due,
        assigned_to='',
        status='OPEN',
        metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
          'origin','F1_RACCOGLITORE_MOBILE',
          'raccoglitore_record_id',r.record_id
        ),
        updated_at=now()
    where user_id=v_user
      and metadata->>'raccoglitore_record_id'=r.record_id
      and upper(coalesce(status,'OPEN')) not in ('DONE','CANCELLED');

    get diagnostics v_task_rows = row_count;

    if v_task_rows=0 then
      insert into public.tasks(
        user_id,lead_id,property_id,pillar,task_type,reason,priority,due_date,
        assigned_to,status,outcome,metadata,updated_at
      ) values(
        v_user,v_lead_id,'',1,'FOLLOW_UP',
        coalesce(nullif(trim(r.payload->>'prossimaAzione'),''),'Ricontatto da Raccoglitore mobile'),
        v_priority,v_due,'','OPEN','',
        jsonb_build_object(
          'origin','F1_RACCOGLITORE_MOBILE',
          'raccoglitore_record_id',r.record_id
        ),
        now()
      );
    end if;
  else
    update public.tasks
    set status='CANCELLED', updated_at=now()
    where user_id=v_user
      and metadata->>'raccoglitore_record_id'=r.record_id
      and upper(coalesce(status,'OPEN')) not in ('DONE','CANCELLED');
  end if;

  return v_lead_id;
end;
$function$;

create or replace function f1_private.raccoglitore_to_crm_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','f1_private','pg_temp'
as $function$
declare
  v_lead_id text;
begin
  if tg_op='DELETE' then
    v_lead_id := 'RACC:' || old.record_id;

    update public.tasks
    set status='CANCELLED',updated_at=now()
    where metadata->>'raccoglitore_record_id'=old.record_id
      and upper(coalesce(status,'OPEN')) not in ('DONE','CANCELLED');

    update public.leads
    set deleted=true,updated_at=now()
    where lead_id=v_lead_id
      and created_by='f1_raccoglitore_sync';

    return old;
  end if;

  perform f1_private.sync_raccoglitore_record_to_crm_v1(new.record_id);
  return new;
end;
$function$;

drop trigger if exists trg_f1_raccoglitore_to_crm_v1 on public.f1_raccoglitore_records;
create trigger trg_f1_raccoglitore_to_crm_v1
after insert or update or delete on public.f1_raccoglitore_records
for each row execute function f1_private.raccoglitore_to_crm_trigger_v1();

create or replace function public.f1_raccoglitore_sync_crm_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public','f1_private','pg_temp'
as $function$
declare
  x record;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  if not f1_private.is_titolare() then raise exception 'ACCESSO RISERVATO AL TITOLARE'; end if;

  for x in select record_id from public.f1_raccoglitore_records order by record_id
  loop
    perform f1_private.sync_raccoglitore_record_to_crm_v1(x.record_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok',true,'synced',v_count,'synced_at',now());
end;
$function$;

grant execute on function public.f1_raccoglitore_sync_crm_v1() to authenticated;

do $$
declare x record;
begin
  for x in select record_id from public.f1_raccoglitore_records order by record_id
  loop
    perform f1_private.sync_raccoglitore_record_to_crm_v1(x.record_id);
  end loop;
end $$;
