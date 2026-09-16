-- F1 Notiziere Mobile: realtime, next-action metadata, photo storage.
-- PC e mobile condividono le stesse tabelle e gli stessi record.

alter table public.f1_territory_progress
  add column if not exists version bigint not null default 1,
  add column if not exists updated_by uuid;

alter table public.f1_territory_observations
  add column if not exists workflow_state text not null default '',
  add column if not exists next_action text not null default '',
  add column if not exists priority text not null default 'NORMALE',
  add column if not exists next_action_at timestamptz,
  add column if not exists version bigint not null default 1,
  add column if not exists updated_by uuid;

create or replace function public.f1_touch_version()
returns trigger
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
  if tg_op='UPDATE' then new.version := coalesce(old.version,0)+1; end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists f1_territory_progress_touch_version on public.f1_territory_progress;
create trigger f1_territory_progress_touch_version before update on public.f1_territory_progress for each row execute function public.f1_touch_version();
drop trigger if exists f1_territory_observations_touch_version on public.f1_territory_observations;
create trigger f1_territory_observations_touch_version before update on public.f1_territory_observations for each row execute function public.f1_touch_version();

create table if not exists public.f1_territory_photos (
  photo_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  progress_id uuid not null references public.f1_territory_progress(progress_id) on delete cascade,
  observation_id uuid references public.f1_territory_observations(observation_id) on delete set null,
  civico text not null default '',kind text not null default 'OSSERVAZIONE',storage_path text not null unique,
  mime_type text not null default 'image/jpeg',latitude double precision,longitude double precision,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.f1_territory_photos enable row level security;
revoke all on table public.f1_territory_photos from anon, authenticated;
grant select,insert,update,delete on table public.f1_territory_photos to authenticated;
drop policy if exists f1_territory_photos_select_own on public.f1_territory_photos;
drop policy if exists f1_territory_photos_insert_own on public.f1_territory_photos;
drop policy if exists f1_territory_photos_update_own on public.f1_territory_photos;
drop policy if exists f1_territory_photos_delete_own on public.f1_territory_photos;
create policy f1_territory_photos_select_own on public.f1_territory_photos for select to authenticated using (auth.uid()=user_id);
create policy f1_territory_photos_insert_own on public.f1_territory_photos for insert to authenticated with check (auth.uid()=user_id);
create policy f1_territory_photos_update_own on public.f1_territory_photos for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy f1_territory_photos_delete_own on public.f1_territory_photos for delete to authenticated using (auth.uid()=user_id);
create index if not exists f1_territory_photos_progress_idx on public.f1_territory_photos(user_id,progress_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('f1-territory-photos','f1-territory-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists f1_territory_storage_insert_own on storage.objects;
drop policy if exists f1_territory_storage_select_own on storage.objects;
drop policy if exists f1_territory_storage_update_own on storage.objects;
drop policy if exists f1_territory_storage_delete_own on storage.objects;
create policy f1_territory_storage_insert_own on storage.objects for insert to authenticated with check (bucket_id='f1-territory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy f1_territory_storage_select_own on storage.objects for select to authenticated using (bucket_id='f1-territory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy f1_territory_storage_update_own on storage.objects for update to authenticated using (bucket_id='f1-territory-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='f1-territory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy f1_territory_storage_delete_own on storage.objects for delete to authenticated using (bucket_id='f1-territory-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.f1_territory_mobile_add_news(
  p_progress_id uuid,p_detail text,p_source text default '',p_person_name text default '',p_phone text default '',
  p_has_location boolean default true,p_knows_owner boolean default false,p_has_name boolean default false,
  p_has_contact boolean default false,p_talked_owner boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_progress public.f1_territory_progress%rowtype;v_row public.f1_territory_observations%rowtype;v_state text;v_next text;v_priority text:='ALTA';v_notes text;
begin
  if trim(coalesce(p_detail,''))='' then raise exception 'INFORMAZIONE CONCRETA OBBLIGATORIA'; end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid();
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  if not coalesce(p_has_location,false) then v_state:='DA_LOCALIZZARE';v_next:='LOCALIZZA IMMOBILE';
  elsif not coalesce(p_knows_owner,false) then v_state:='PROPRIETARIO_DA_IDENTIFICARE';v_next:='IDENTIFICA PROPRIETARIO';
  elsif not coalesce(p_has_name,false) then v_state:='IDENTITA_DA_COMPLETARE';v_next:='COMPLETA IDENTITA PROPRIETARIO';
  elsif not coalesce(p_has_contact,false) then v_state:='RECAPITO_DA_TROVARE';v_next:='CERCA RECAPITO';
  elsif not coalesce(p_talked_owner,false) then v_state:='DA_CONTATTARE';v_next:='CONTATTA PROPRIETARIO';
  else v_state:='DA_QUALIFICARE';v_next:='QUALIFICA ESIGENZA'; end if;
  v_notes:=concat_ws(E'\n',case when trim(coalesce(p_phone,''))<>'' then 'RECAPITO: '||trim(p_phone) end,'STATO GUIDATO: '||v_state,'PROSSIMA AZIONE: '||v_next);
  insert into public.f1_territory_observations(user_id,progress_id,session_id,observation_type,news_type,comune,zona,via,civico,detail,source,person_name,notes,status,workflow_state,next_action,priority,updated_by)
  values(auth.uid(),v_progress.progress_id,v_progress.session_id,'NOTIZIA_IMMOBILIARE','DA_CLASSIFICARE',v_progress.comune,v_progress.zona,v_progress.via,coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.last_civic,''),nullif(v_progress.civic_start,''),''),trim(p_detail),trim(coalesce(p_source,'')),trim(coalesce(p_person_name,'')),v_notes,'DA_INSERIRE_CRM',v_state,v_next,v_priority,auth.uid()) returning * into v_row;
  if v_progress.session_id is not null then update public.f1_territory_sessions set nuove_notizie=nuove_notizie+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
  return to_jsonb(v_row);
end;$$;
revoke all on function public.f1_territory_mobile_add_news(uuid,text,text,text,text,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.f1_territory_mobile_add_news(uuid,text,text,text,text,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.f1_territory_panel_state()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
with p as (
  select x.* from public.f1_territory_progress x where x.user_id=auth.uid() and x.status<>'COMPLETATA'
  order by case x.status when 'DA_CONSUNTIVARE' then 0 when 'IN_CORSO' then 1 when 'PARZIALE' then 2 when 'DA_RIPASSARE' then 3 else 4 end,x.work_date asc,x.updated_at desc limit 1
),s as (
  select x.* from public.f1_territory_sessions x where x.user_id=auth.uid() and exists(select 1 from p) and (x.id=(select session_id from p) or ((select session_id from p) is null and x.session_date=(select work_date from p))) order by case when x.id=(select session_id from p) then 0 else 1 end,x.started_at desc limit 1
),o as (select x.* from public.f1_territory_observations x where x.user_id=auth.uid() and x.progress_id=(select progress_id from p)),
counts as (select count(*) filter(where upper(observation_type)='CONDOMINIO')::integer condominiums,count(*) filter(where coalesce(news_type,'')<>'')::integer observation_news,count(*) filter(where status='DA_INSERIRE_CRM' and crm_record_id is null)::integer pending_news,count(*) filter(where status='INSERITA_CRM' and crm_record_id is not null)::integer inserted_news from o)
select jsonb_build_object('progress',(select to_jsonb(p) from p),'summary',jsonb_build_object('civics',coalesce((select civici_lavorati from s),0),'streets_in_progress',case when exists(select 1 from p) then 1 else 0 end,'condominiums',coalesce((select condominiums from counts),0),'activities',coalesce((select attivita_trovate from s),0),'contacts',coalesce((select nuovi_contatti from s),0),'news',greatest(coalesce((select nuove_notizie from s),0),coalesce((select observation_news from counts),0)),'pending_crm',coalesce((select pending_news from counts),0),'inserted_crm',coalesce((select inserted_news from counts),0),'callbacks',coalesce((select richiami_generati from s),0)),'pending_news',coalesce((select jsonb_agg(to_jsonb(q) order by q.observed_at asc) from (select observation_id,progress_id,observed_at,observation_type,news_type,comune,zona,via,civico,building,detail,source,person_name,notes,status,crm_record_id,workflow_state,next_action,priority,next_action_at,version,updated_at from o where status='DA_INSERIRE_CRM' and crm_record_id is null order by observed_at asc limit 50) q),'[]'::jsonb));$$;
revoke all on function public.f1_territory_panel_state() from public,anon;
grant execute on function public.f1_territory_panel_state() to authenticated;

do $$ declare t text; begin
  foreach t in array array['f1_territory_progress','f1_territory_observations','f1_territory_sessions','tasks','f1_real_estate_news','leads','f1_territory_photos'] loop
    if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t) and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
end $$;
alter table public.f1_territory_progress replica identity full;
alter table public.f1_territory_observations replica identity full;
alter table public.f1_territory_sessions replica identity full;
alter table public.f1_territory_photos replica identity full;

create table if not exists public.f1_mobile_presence (
  user_id uuid primary key default auth.uid(),device_id text not null default '',status text not null default 'OPERATIVO' check(status in ('OPERATIVO','IN_PAUSA','FINE_GIRO')),progress_id uuid references public.f1_territory_progress(progress_id) on delete set null,current_civic text not null default '',latitude double precision,longitude double precision,last_seen_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.f1_mobile_presence enable row level security;
revoke all on table public.f1_mobile_presence from anon,authenticated;
grant select,insert,update,delete on table public.f1_mobile_presence to authenticated;
drop policy if exists f1_mobile_presence_select_team on public.f1_mobile_presence;
drop policy if exists f1_mobile_presence_insert_own on public.f1_mobile_presence;
drop policy if exists f1_mobile_presence_update_own on public.f1_mobile_presence;
drop policy if exists f1_mobile_presence_delete_own on public.f1_mobile_presence;
create policy f1_mobile_presence_select_team on public.f1_mobile_presence for select to authenticated using ((select f1_private.can_access_user(f1_mobile_presence.user_id)));
create policy f1_mobile_presence_insert_own on public.f1_mobile_presence for insert to authenticated with check(auth.uid()=user_id);
create policy f1_mobile_presence_update_own on public.f1_mobile_presence for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy f1_mobile_presence_delete_own on public.f1_mobile_presence for delete to authenticated using(auth.uid()=user_id);

drop policy if exists territory_progress_select_team on public.f1_territory_progress;
drop policy if exists territory_observations_select_team on public.f1_territory_observations;
drop policy if exists territory_sessions_select_team on public.f1_territory_sessions;
drop policy if exists territory_photos_select_team on public.f1_territory_photos;
create policy territory_progress_select_team on public.f1_territory_progress for select to authenticated using ((select f1_private.can_access_user(f1_territory_progress.user_id)));
create policy territory_observations_select_team on public.f1_territory_observations for select to authenticated using ((select f1_private.can_access_user(f1_territory_observations.user_id)));
create policy territory_sessions_select_team on public.f1_territory_sessions for select to authenticated using ((select f1_private.can_access_user(f1_territory_sessions.user_id)));
create policy territory_photos_select_team on public.f1_territory_photos for select to authenticated using ((select f1_private.can_access_user(f1_territory_photos.user_id)));

do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='f1_mobile_presence') then alter publication supabase_realtime add table public.f1_mobile_presence; end if; end $$;
alter table public.f1_mobile_presence replica identity full;

create or replace function public.f1_territory_admin_tours()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role is distinct from 'TITOLARE' then raise exception 'FUNZIONE RISERVATA AL TITOLARE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('progress_id',p.progress_id,'user_id',p.user_id,'first_name',s.first_name,'last_name',s.last_name,'role',s.role,'comune',p.comune,'zona',p.zona,'via',p.via,'street_segment',p.street_segment,'civic_start',p.civic_start,'civic_end',p.civic_end,'last_civic',p.last_civic,'next_civic',p.next_civic,'civic_sequence',p.civic_sequence,'status',p.status,'work_date',p.work_date,'updated_at',p.updated_at,'completed_count',case when coalesce(array_length(p.civic_sequence,1),0)=0 then 0 when nullif(p.last_civic,'') is null then 0 else coalesce(array_position(p.civic_sequence,p.last_civic),0) end,'total_count',coalesce(array_length(p.civic_sequence,1),0),'mobile_status',case when pr.last_seen_at is null or pr.last_seen_at<now()-interval '90 seconds' then 'OFFLINE' else pr.status end,'mobile_current_civic',coalesce(nullif(pr.current_civic,''),nullif(p.next_civic,''),''),'mobile_last_seen_at',pr.last_seen_at,'mobile_device_id',pr.device_id) order by p.updated_at desc) from public.f1_territory_progress p join public.f1_staff_profiles s on s.user_id=p.user_id left join public.f1_mobile_presence pr on pr.user_id=p.user_id where p.status<>'COMPLETATA'),'[]'::jsonb);
end;$$;
revoke all on function public.f1_territory_admin_tours() from public,anon;
grant execute on function public.f1_territory_admin_tours() to authenticated;
