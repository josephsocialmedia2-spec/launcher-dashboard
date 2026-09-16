create or replace function public.f1_territory_admin_team()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  select upper(role) into v_role
  from public.f1_staff_profiles
  where user_id = auth.uid() and status = 'ACTIVE';
  if v_role is distinct from 'TITOLARE' then
    raise exception 'FUNZIONE RISERVATA AL TITOLARE';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',s.user_id,'first_name',s.first_name,'last_name',s.last_name,
      'role',s.role,'status',s.status,'assigned_territory',s.assigned_territory
    ) order by s.role,s.last_name,s.first_name)
    from public.f1_staff_profiles s
    where s.status='ACTIVE'
  ),'[]'::jsonb);
end;
$$;

create or replace function public.f1_territory_admin_tours()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  select upper(role) into v_role
  from public.f1_staff_profiles
  where user_id = auth.uid() and status = 'ACTIVE';
  if v_role is distinct from 'TITOLARE' then
    raise exception 'FUNZIONE RISERVATA AL TITOLARE';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'progress_id',p.progress_id,'user_id',p.user_id,
      'first_name',s.first_name,'last_name',s.last_name,'role',s.role,
      'comune',p.comune,'zona',p.zona,'via',p.via,'street_segment',p.street_segment,
      'civic_start',p.civic_start,'civic_end',p.civic_end,
      'last_civic',p.last_civic,'next_civic',p.next_civic,
      'civic_sequence',p.civic_sequence,'status',p.status,
      'work_date',p.work_date,'updated_at',p.updated_at,
      'completed_count',case
        when coalesce(array_length(p.civic_sequence,1),0)=0 then 0
        when nullif(p.last_civic,'') is null then 0
        else coalesce(array_position(p.civic_sequence,p.last_civic),0)
      end,
      'total_count',coalesce(array_length(p.civic_sequence,1),0)
    ) order by p.updated_at desc)
    from public.f1_territory_progress p
    join public.f1_staff_profiles s on s.user_id=p.user_id
    where p.status <> 'COMPLETATA'
  ),'[]'::jsonb);
end;
$$;

create or replace function public.f1_territory_assign_tour(
  p_user_id uuid,
  p_comune text,
  p_zona text default '',
  p_via text default '',
  p_street_segment text default '',
  p_civics text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_target public.f1_staff_profiles%rowtype;
  v_seq text[];
  v_existing public.f1_territory_progress%rowtype;
  v_session_id uuid;
  v_progress public.f1_territory_progress%rowtype;
begin
  select upper(role) into v_role
  from public.f1_staff_profiles
  where user_id = auth.uid() and status = 'ACTIVE';
  if v_role is distinct from 'TITOLARE' then
    raise exception 'FUNZIONE RISERVATA AL TITOLARE';
  end if;
  if p_user_id is null then raise exception 'FUNZIONARIO OBBLIGATORIO'; end if;
  if trim(coalesce(p_comune,''))='' then raise exception 'COMUNE OBBLIGATORIO'; end if;
  if trim(coalesce(p_via,''))='' then raise exception 'VIA OBBLIGATORIA'; end if;

  select * into v_target from public.f1_staff_profiles where user_id=p_user_id and status='ACTIVE';
  if not found then raise exception 'FUNZIONARIO NON DISPONIBILE'; end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select * into v_existing
  from public.f1_territory_progress
  where user_id=p_user_id and status <> 'COMPLETATA'
  order by updated_at desc limit 1 for update;

  if found then
    return jsonb_build_object(
      'ok',false,'code','ACTIVE_TOUR_EXISTS','message','IL FUNZIONARIO HA GIÀ UN GIRO ATTIVO',
      'existing',jsonb_build_object(
        'progress_id',v_existing.progress_id,'comune',v_existing.comune,'zona',v_existing.zona,
        'via',v_existing.via,'last_civic',v_existing.last_civic,'next_civic',v_existing.next_civic,
        'status',v_existing.status,'civic_sequence',v_existing.civic_sequence
      )
    );
  end if;

  select coalesce(array_agg(civic order by ord),'{}'::text[])
  into v_seq
  from (
    select trim(raw) civic,min(ord) ord
    from unnest(coalesce(p_civics,'{}'::text[])) with ordinality as u(raw,ord)
    where trim(coalesce(raw,''))<>''
    group by trim(raw)
  ) q;
  if coalesce(array_length(v_seq,1),0)=0 then raise exception 'INSERISCI ALMENO UN CIVICO'; end if;

  insert into public.f1_territory_sessions(user_id,session_date,block_name,started_at,note)
  values (p_user_id,current_date,'ALTRO',now(),'RICERCA TERRITORIALE · '||trim(p_comune)||' · '||trim(p_via))
  returning id into v_session_id;

  insert into public.f1_territory_progress(
    user_id,session_id,work_date,comune,zona,via,street_segment,
    civic_start,civic_end,last_civic,next_civic,status,civic_sequence,last_visit_at
  ) values (
    p_user_id,v_session_id,current_date,trim(p_comune),trim(coalesce(p_zona,'')),trim(p_via),trim(coalesce(p_street_segment,'')),
    v_seq[1],v_seq[array_length(v_seq,1)],'',v_seq[1],'IN_CORSO',v_seq,now()
  ) returning * into v_progress;

  update public.f1_staff_profiles
  set assigned_territory=jsonb_build_object(
      'comune',v_progress.comune,'zona',v_progress.zona,'via',v_progress.via,
      'progress_id',v_progress.progress_id,'attivita','RICERCA_TERRITORIALE'
    ),updated_at=now()
  where user_id=p_user_id;

  return jsonb_build_object(
    'ok',true,'progress_id',v_progress.progress_id,'session_id',v_session_id,'user_id',v_progress.user_id,
    'comune',v_progress.comune,'zona',v_progress.zona,'via',v_progress.via,
    'civic_start',v_progress.civic_start,'civic_end',v_progress.civic_end,
    'next_civic',v_progress.next_civic,'civic_sequence',v_progress.civic_sequence,'status',v_progress.status
  );
end;
$$;

revoke all on function public.f1_territory_admin_team() from public, anon;
revoke all on function public.f1_territory_admin_tours() from public, anon;
revoke all on function public.f1_territory_assign_tour(uuid,text,text,text,text,text[]) from public, anon;
grant execute on function public.f1_territory_admin_team() to authenticated;
grant execute on function public.f1_territory_admin_tours() to authenticated;
grant execute on function public.f1_territory_assign_tour(uuid,text,text,text,text,text[]) to authenticated;
