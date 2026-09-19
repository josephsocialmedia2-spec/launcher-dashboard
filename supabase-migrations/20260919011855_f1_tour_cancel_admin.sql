alter table public.f1_territory_progress
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

create index if not exists f1_territory_progress_cancelled_at_idx
  on public.f1_territory_progress(cancelled_at)
  where cancelled_at is not null;

create or replace function public.f1_territory_guard_cancelled_progress()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.cancelled_at is not null then
    raise exception 'GIRO TERRITORIALE ANNULLATO';
  end if;
  return new;
end;
$$;

drop trigger if exists f1_territory_guard_cancelled_progress_trg on public.f1_territory_progress;
create trigger f1_territory_guard_cancelled_progress_trg
before update on public.f1_territory_progress
for each row
when (old.cancelled_at is not null)
execute function public.f1_territory_guard_cancelled_progress();

create or replace function public.f1_territory_admin_delete_tour(p_progress_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_progress public.f1_territory_progress%rowtype;
  v_now timestamptz := now();
begin
  if v_actor is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select upper(role) into v_role from public.f1_staff_profiles where user_id=v_actor and status='ACTIVE';
  if v_role is distinct from 'TITOLARE' then raise exception 'FUNZIONE RISERVATA AL TITOLARE'; end if;
  if p_progress_id is null then raise exception 'GIRO TERRITORIALE OBBLIGATORIO'; end if;

  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id for update;
  if not found then raise exception 'GIRO TERRITORIALE NON TROVATO'; end if;

  if v_progress.cancelled_at is not null then
    return jsonb_build_object('ok',true,'code','ALREADY_DELETED','progress_id',v_progress.progress_id,'user_id',v_progress.user_id,'deleted_at',v_progress.cancelled_at);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_progress.user_id::text));

  update public.f1_territory_progress
  set cancelled_at=v_now,cancelled_by=v_actor,status='COMPLETATA',next_civic='',updated_at=v_now,updated_by=v_actor
  where progress_id=p_progress_id;

  update public.f1_staff_profiles
  set assigned_territory='{}'::jsonb,updated_at=v_now
  where user_id=v_progress.user_id and assigned_territory->>'progress_id'=p_progress_id::text;

  update public.f1_mobile_presence
  set progress_id=null,current_civic='',updated_at=v_now
  where user_id=v_progress.user_id and progress_id=p_progress_id;

  insert into public.f1_audit_log(actor_user_id,owner_user_id,action,table_name,record_key,before_data,after_data,source,reason)
  values(v_actor,v_progress.user_id,'TERRITORY_TOUR_DELETED','f1_territory_progress',p_progress_id::text,to_jsonb(v_progress),
         jsonb_build_object('progress_id',p_progress_id,'user_id',v_progress.user_id,'status','COMPLETATA','cancelled_at',v_now,'cancelled_by',v_actor,'active',false),
         'F1_TERRITORY_ADMIN','Giro eliminato dal titolare; dati territoriali storici preservati');

  return jsonb_build_object('ok',true,'progress_id',p_progress_id,'user_id',v_progress.user_id,'deleted_at',v_now,'status','DELETED');
end;
$$;

revoke all on function public.f1_territory_admin_delete_tour(uuid) from public;
revoke all on function public.f1_territory_admin_delete_tour(uuid) from anon;
grant execute on function public.f1_territory_admin_delete_tour(uuid) to authenticated;

comment on function public.f1_territory_admin_delete_tour(uuid)
is 'Titolare-only soft deletion of an active territory tour. Preserves historical territory records, clears active staff/mobile assignment, and writes audit log.';
