alter table public.f1_territory_progress
  add column if not exists civic_sequence text[] not null default '{}'::text[];

comment on column public.f1_territory_progress.civic_sequence is
  'Sequenza civici configurata per il giro guidato. L''ordine è esplicito: F1 non inventa il civico successivo.';

create or replace function public.f1_territory_guided_add_observation(
  p_progress_id uuid,
  p_observation_type text,
  p_detail text,
  p_news_type text default '',
  p_building text default '',
  p_source text default '',
  p_person_name text default '',
  p_notes text default '',
  p_status text default 'OSSERVAZIONE'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_row public.f1_territory_observations%rowtype;
  v_status text := upper(trim(coalesce(p_status,'OSSERVAZIONE')));
  v_type text := upper(trim(coalesce(p_observation_type,'')));
begin
  if v_type = '' then
    raise exception 'TIPO OSSERVAZIONE OBBLIGATORIO';
  end if;
  if trim(coalesce(p_detail,'')) = '' then
    raise exception 'DETTAGLIO OSSERVAZIONE OBBLIGATORIO';
  end if;
  if v_status not in ('OSSERVAZIONE','DA_INSERIRE_CRM','INSERITA_CRM') then
    raise exception 'STATO OSSERVAZIONE NON VALIDO';
  end if;

  select * into v_progress
  from public.f1_territory_progress
  where progress_id = p_progress_id and user_id = auth.uid();

  if not found then
    raise exception 'GIRO TERRITORIALE NON DISPONIBILE';
  end if;

  insert into public.f1_territory_observations(
    user_id,progress_id,session_id,observation_type,news_type,
    comune,zona,via,civico,building,detail,source,person_name,notes,status
  ) values (
    auth.uid(),v_progress.progress_id,v_progress.session_id,v_type,trim(coalesce(p_news_type,'')),
    v_progress.comune,v_progress.zona,v_progress.via,
    coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.last_civic,''),nullif(v_progress.civic_start,''),''),
    trim(coalesce(p_building,'')),trim(p_detail),trim(coalesce(p_source,'')),
    trim(coalesce(p_person_name,'')),trim(coalesce(p_notes,'')),v_status
  ) returning * into v_row;

  if v_progress.session_id is not null and v_type in ('NEGOZIO_ATTIVITA','ATTIVITA_LOCALE') then
    update public.f1_territory_sessions
      set attivita_trovate = attivita_trovate + 1
    where id = v_progress.session_id and user_id = auth.uid();
  end if;

  if v_progress.session_id is not null and v_status = 'DA_INSERIRE_CRM' then
    update public.f1_territory_sessions
      set nuove_notizie = nuove_notizie + 1
    where id = v_progress.session_id and user_id = auth.uid();
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.f1_territory_guided_register_contact(p_progress_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
begin
  select * into v_progress
  from public.f1_territory_progress
  where progress_id = p_progress_id and user_id = auth.uid();

  if not found then
    raise exception 'GIRO TERRITORIALE NON DISPONIBILE';
  end if;

  if v_progress.session_id is not null then
    update public.f1_territory_sessions
      set nuovi_contatti = nuovi_contatti + 1
    where id = v_progress.session_id and user_id = auth.uid();
  end if;

  return jsonb_build_object('ok',true,'progress_id',v_progress.progress_id,'session_id',v_progress.session_id);
end;
$$;

create or replace function public.f1_territory_guided_pause(
  p_progress_id uuid,
  p_expected_civic text default '',
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_current text;
begin
  select * into v_progress
  from public.f1_territory_progress
  where progress_id = p_progress_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'GIRO TERRITORIALE NON DISPONIBILE';
  end if;

  v_current := coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.last_civic,''),nullif(v_progress.civic_start,''),'');
  if trim(coalesce(p_expected_civic,'')) <> '' and v_current <> trim(p_expected_civic) then
    raise exception 'IL PUNTO DEL GIRO È CAMBIATO. RICARICA I DATI.';
  end if;

  update public.f1_territory_progress
     set status = 'PARZIALE',
         last_visit_at = now(),
         updated_at = now()
   where progress_id = v_progress.progress_id;

  if v_progress.session_id is not null and (p_latitude is not null or p_longitude is not null) then
    update public.f1_territory_sessions
       set end_latitude = coalesce(p_latitude,end_latitude),
           end_longitude = coalesce(p_longitude,end_longitude)
     where id = v_progress.session_id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'ok',true,
    'progress_id',v_progress.progress_id,
    'current_civic',v_current,
    'status','PARZIALE'
  );
end;
$$;

create or replace function public.f1_territory_guided_complete_civic(
  p_progress_id uuid,
  p_expected_civic text,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_current text;
  v_next text := '';
  v_pos integer;
  v_len integer;
  v_status text := 'PARZIALE';
begin
  select * into v_progress
  from public.f1_territory_progress
  where progress_id = p_progress_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'GIRO TERRITORIALE NON DISPONIBILE';
  end if;

  v_current := coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.civic_start,''),'');
  if v_current = '' then
    raise exception 'CIVICO CORRENTE NON CONFIGURATO';
  end if;
  if trim(coalesce(p_expected_civic,'')) = '' or v_current <> trim(p_expected_civic) then
    raise exception 'IL CIVICO CORRENTE È CAMBIATO. RICARICA I DATI.';
  end if;

  v_len := coalesce(array_length(v_progress.civic_sequence,1),0);
  if v_len > 0 then
    v_pos := array_position(v_progress.civic_sequence,v_current);
    if v_pos is null then
      raise exception 'CIVICO CORRENTE NON PRESENTE NELLA SEQUENZA CONFIGURATA';
    end if;
    if v_pos < v_len then
      v_next := v_progress.civic_sequence[v_pos+1];
      v_status := 'IN_CORSO';
    else
      v_next := '';
      v_status := 'DA_CONSUNTIVARE';
    end if;
  else
    -- Fail closed: senza sequenza esplicita F1 non inventa il civico successivo.
    v_next := '';
    v_status := 'PARZIALE';
  end if;

  update public.f1_territory_progress
     set last_civic = v_current,
         next_civic = v_next,
         status = v_status,
         last_visit_at = now(),
         updated_at = now()
   where progress_id = v_progress.progress_id;

  if v_progress.session_id is not null then
    update public.f1_territory_sessions
       set civici_lavorati = civici_lavorati + 1,
           end_latitude = coalesce(p_latitude,end_latitude),
           end_longitude = coalesce(p_longitude,end_longitude)
     where id = v_progress.session_id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'ok',true,
    'progress_id',v_progress.progress_id,
    'completed_civic',v_current,
    'next_civic',v_next,
    'status',v_status,
    'sequence_configured',(v_len > 0)
  );
end;
$$;

create or replace function public.f1_territory_guided_set_civic_sequence(
  p_progress_id uuid,
  p_civics text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_progress public.f1_territory_progress%rowtype;
  v_sequence text[];
  v_last_pos integer;
  v_next text := '';
begin
  select * into v_progress
  from public.f1_territory_progress
  where progress_id = p_progress_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'GIRO TERRITORIALE NON DISPONIBILE';
  end if;

  select coalesce(array_agg(x.civic order by x.ord),'{}'::text[])
    into v_sequence
  from (
    select civic,min(ord) ord
    from unnest(coalesce(p_civics,'{}'::text[])) with ordinality as u(raw,ord)
    cross join lateral (select trim(u.raw) as civic) c
    where c.civic <> ''
    group by civic
  ) x;

  if coalesce(array_length(v_sequence,1),0) = 0 then
    raise exception 'SEQUENZA CIVICI VUOTA';
  end if;

  if nullif(v_progress.last_civic,'') is not null then
    v_last_pos := array_position(v_sequence,v_progress.last_civic);
  end if;
  if v_last_pos is not null and v_last_pos < array_length(v_sequence,1) then
    v_next := v_sequence[v_last_pos+1];
  elsif v_last_pos is null then
    v_next := v_sequence[1];
  end if;

  update public.f1_territory_progress
     set civic_sequence = v_sequence,
         civic_start = coalesce(nullif(civic_start,''),v_sequence[1]),
         civic_end = v_sequence[array_length(v_sequence,1)],
         next_civic = v_next,
         status = case when v_next = '' then 'DA_CONSUNTIVARE' else 'IN_CORSO' end,
         updated_at = now()
   where progress_id = v_progress.progress_id;

  return jsonb_build_object('ok',true,'progress_id',v_progress.progress_id,'civic_sequence',v_sequence,'next_civic',v_next);
end;
$$;

revoke all on function public.f1_territory_guided_add_observation(uuid,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.f1_territory_guided_register_contact(uuid) from public, anon;
revoke all on function public.f1_territory_guided_pause(uuid,text,double precision,double precision) from public, anon;
revoke all on function public.f1_territory_guided_complete_civic(uuid,text,double precision,double precision) from public, anon;
revoke all on function public.f1_territory_guided_set_civic_sequence(uuid,text[]) from public, anon;

grant execute on function public.f1_territory_guided_add_observation(uuid,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.f1_territory_guided_register_contact(uuid) to authenticated;
grant execute on function public.f1_territory_guided_pause(uuid,text,double precision,double precision) to authenticated;
grant execute on function public.f1_territory_guided_complete_civic(uuid,text,double precision,double precision) to authenticated;
grant execute on function public.f1_territory_guided_set_civic_sequence(uuid,text[]) to authenticated;
