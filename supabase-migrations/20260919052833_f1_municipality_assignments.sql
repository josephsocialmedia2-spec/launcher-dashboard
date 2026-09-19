create table if not exists public.f1_territory_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comune text not null,
  status text not null default 'ACTIVE',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  constraint f1_territory_assignments_comune_nonempty check (btrim(comune) <> ''),
  constraint f1_territory_assignments_status_check check (status in ('ACTIVE','CANCELLED'))
);
alter table public.f1_territory_assignments enable row level security;
revoke all on table public.f1_territory_assignments from public, anon, authenticated;
create unique index if not exists f1_territory_assignments_one_active_per_user
  on public.f1_territory_assignments(user_id) where status='ACTIVE';
create index if not exists f1_territory_assignments_active_lookup
  on public.f1_territory_assignments(status, updated_at desc);

create or replace function public.f1_territory_assign_municipality(p_user_id uuid,p_comune text)
returns jsonb language plpgsql security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_target public.f1_staff_profiles%rowtype;
  v_existing public.f1_territory_assignments%rowtype;
  v_legacy public.f1_territory_progress%rowtype;
  v_assignment public.f1_territory_assignments%rowtype;
  v_comune text := trim(coalesce(p_comune,''));
begin
  if v_actor is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select upper(role) into v_role from public.f1_staff_profiles where user_id=v_actor and status='ACTIVE';
  if v_role is distinct from 'TITOLARE' then raise exception 'FUNZIONE RISERVATA AL TITOLARE'; end if;
  if p_user_id is null then raise exception 'FUNZIONARIO OBBLIGATORIO'; end if;
  if v_comune='' then raise exception 'COMUNE OBBLIGATORIO'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select * into v_target from public.f1_staff_profiles
  where user_id=p_user_id and status='ACTIVE' and upper(role)='FUNZIONARIO' for update;
  if not found then raise exception 'FUNZIONARIO NON DISPONIBILE'; end if;
  select * into v_existing from public.f1_territory_assignments
  where user_id=p_user_id and status='ACTIVE'
  order by updated_at desc limit 1 for update;
  if found then
    return jsonb_build_object('ok',false,'code','ACTIVE_TOUR_EXISTS','message','IL FUNZIONARIO HA GIÀ UN GIRO ATTIVO',
      'existing',jsonb_build_object('assignment_id',v_existing.assignment_id,'comune',v_existing.comune,'status',v_existing.status,'assigned_at',v_existing.created_at));
  end if;
  if coalesce(v_target.assigned_territory->>'progress_id','')<>'' then
    select * into v_legacy from public.f1_territory_progress
    where user_id=p_user_id and progress_id::text=v_target.assigned_territory->>'progress_id' and status<>'COMPLETATA'
    order by updated_at desc limit 1;
    if found then
      return jsonb_build_object('ok',false,'code','ACTIVE_TOUR_EXISTS','message','IL FUNZIONARIO HA GIÀ UN GIRO ATTIVO',
        'existing',jsonb_build_object('progress_id',v_legacy.progress_id,'comune',v_legacy.comune,'status',v_legacy.status,'legacy',true));
    end if;
  end if;
  insert into public.f1_territory_assignments(user_id,comune,status,created_by)
  values(p_user_id,v_comune,'ACTIVE',v_actor) returning * into v_assignment;
  update public.f1_staff_profiles
  set assigned_territory=jsonb_build_object('comune',v_assignment.comune,'assignment_id',v_assignment.assignment_id,'scope','COMUNE','attivita','RICERCA_TERRITORIALE'),
      updated_at=now()
  where user_id=p_user_id;
  insert into public.f1_audit_log(actor_user_id,owner_user_id,action,table_name,record_key,after_data,source,reason)
  values(v_actor,p_user_id,'TERRITORY_MUNICIPALITY_ASSIGNED','f1_territory_assignments',v_assignment.assignment_id::text,
         to_jsonb(v_assignment),'F1_TERRITORY_ADMIN','Comune assegnato al funzionario');
  return jsonb_build_object('ok',true,'assignment_id',v_assignment.assignment_id,'user_id',v_assignment.user_id,'comune',v_assignment.comune,'status','ACTIVE','assigned_at',v_assignment.created_at);
end;
$$;

create or replace function public.f1_territory_admin_delete_assignment(p_assignment_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_assignment public.f1_territory_assignments%rowtype;
  v_now timestamptz := now();
begin
  if v_actor is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select upper(role) into v_role from public.f1_staff_profiles where user_id=v_actor and status='ACTIVE';
  if v_role is distinct from 'TITOLARE' then raise exception 'FUNZIONE RISERVATA AL TITOLARE'; end if;
  if p_assignment_id is null then raise exception 'ASSEGNAZIONE OBBLIGATORIA'; end if;
  select * into v_assignment from public.f1_territory_assignments where assignment_id=p_assignment_id for update;
  if not found then raise exception 'ASSEGNAZIONE NON TROVATA'; end if;
  if v_assignment.status='CANCELLED' then
    return jsonb_build_object('ok',true,'code','ALREADY_DELETED','assignment_id',v_assignment.assignment_id,'user_id',v_assignment.user_id,'deleted_at',v_assignment.cancelled_at);
  end if;
  perform pg_advisory_xact_lock(hashtext(v_assignment.user_id::text));
  update public.f1_territory_assignments
  set status='CANCELLED',cancelled_at=v_now,cancelled_by=v_actor,updated_at=v_now
  where assignment_id=p_assignment_id;
  update public.f1_staff_profiles
  set assigned_territory='{}'::jsonb,updated_at=v_now
  where user_id=v_assignment.user_id and assigned_territory->>'assignment_id'=p_assignment_id::text;
  insert into public.f1_audit_log(actor_user_id,owner_user_id,action,table_name,record_key,before_data,after_data,source,reason)
  values(v_actor,v_assignment.user_id,'TERRITORY_MUNICIPALITY_DELETED','f1_territory_assignments',p_assignment_id::text,
         to_jsonb(v_assignment),jsonb_build_object('assignment_id',p_assignment_id,'status','CANCELLED','cancelled_at',v_now,'cancelled_by',v_actor),
         'F1_TERRITORY_ADMIN','Assegnazione comunale eliminata; progressi territoriali storici preservati');
  return jsonb_build_object('ok',true,'assignment_id',p_assignment_id,'user_id',v_assignment.user_id,'deleted_at',v_now,'status','DELETED');
end;
$$;

create or replace function public.f1_territory_admin_tours()
returns jsonb language plpgsql security definer
set search_path to 'public','pg_temp'
as $$
declare v_role text;
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role is distinct from 'TITOLARE' then raise exception 'FUNZIONE RISERVATA AL TITOLARE'; end if;
  return coalesce((
    select jsonb_agg(q.item order by q.sort_at desc)
    from (
      select a.updated_at sort_at,
        jsonb_build_object(
          'assignment_type','MUNICIPALITY','assignment_id',a.assignment_id,'progress_id',null,
          'user_id',a.user_id,'first_name',s.first_name,'last_name',s.last_name,'role',s.role,
          'comune',a.comune,'status','ACTIVE','assigned_at',a.created_at,'updated_at',a.updated_at,
          'completed_count',0,'total_count',0
        ) item
      from public.f1_territory_assignments a
      join public.f1_staff_profiles s on s.user_id=a.user_id
      where a.status='ACTIVE'
      union all
      select p.updated_at sort_at,
        jsonb_build_object(
          'assignment_type','LEGACY_PROGRESS','assignment_id',null,'progress_id',p.progress_id,
          'user_id',p.user_id,'first_name',s.first_name,'last_name',s.last_name,'role',s.role,
          'comune',p.comune,'zona',p.zona,'via',p.via,'street_segment',p.street_segment,
          'civic_start',p.civic_start,'civic_end',p.civic_end,'last_civic',p.last_civic,'next_civic',p.next_civic,
          'civic_sequence',p.civic_sequence,'status',p.status,'work_date',p.work_date,'updated_at',p.updated_at,
          'completed_count',case when coalesce(array_length(p.civic_sequence,1),0)=0 then 0 when nullif(p.last_civic,'') is null then 0 else coalesce(array_position(p.civic_sequence,p.last_civic),0) end,
          'total_count',coalesce(array_length(p.civic_sequence,1),0),
          'mobile_status',case when pr.last_seen_at is null or pr.last_seen_at<now()-interval '90 seconds' then 'OFFLINE' else pr.status end,
          'mobile_current_civic',coalesce(nullif(pr.current_civic,''),nullif(p.next_civic,''),''),
          'mobile_last_seen_at',pr.last_seen_at,'mobile_device_id',pr.device_id
        ) item
      from public.f1_territory_progress p
      join public.f1_staff_profiles s on s.user_id=p.user_id
      left join public.f1_mobile_presence pr on pr.user_id=p.user_id
      where p.status<>'COMPLETATA'
        and not exists(select 1 from public.f1_territory_assignments a where a.user_id=p.user_id and a.status='ACTIVE')
    ) q
  ),'[]'::jsonb);
end;
$$;

revoke execute on function public.f1_territory_assign_municipality(uuid,text) from public, anon;
revoke execute on function public.f1_territory_admin_delete_assignment(uuid) from public, anon;
grant execute on function public.f1_territory_assign_municipality(uuid,text) to authenticated;
grant execute on function public.f1_territory_admin_delete_assignment(uuid) to authenticated;
revoke execute on function public.f1_territory_admin_tours() from public, anon;
grant execute on function public.f1_territory_admin_tours() to authenticated;
