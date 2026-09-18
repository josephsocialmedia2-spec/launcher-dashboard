
-- F1 Territory Online v3
-- Municipality-first workflow, street catalog, property notes/audio, bulletin PDF, CRM v3.

create table if not exists public.f1_territory_street_catalog (
  street_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  comune text not null,
  via text not null,
  road_type text,
  source text not null default 'OPENSTREETMAP',
  source_ref text,
  status text not null default 'DA_INIZIARE',
  last_civic text,
  next_civic text,
  coverage_pct integer not null default 0 check (coverage_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, comune, via)
);
create index if not exists idx_f1_territory_street_catalog_user_comune on public.f1_territory_street_catalog(user_id, comune, status, updated_at desc);
alter table public.f1_territory_street_catalog enable row level security;
drop policy if exists f1_territory_street_catalog_select on public.f1_territory_street_catalog;
create policy f1_territory_street_catalog_select on public.f1_territory_street_catalog for select using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_street_catalog_insert on public.f1_territory_street_catalog;
create policy f1_territory_street_catalog_insert on public.f1_territory_street_catalog for insert with check (user_id = auth.uid());
drop policy if exists f1_territory_street_catalog_update on public.f1_territory_street_catalog;
create policy f1_territory_street_catalog_update on public.f1_territory_street_catalog for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists f1_territory_street_catalog_delete on public.f1_territory_street_catalog;
create policy f1_territory_street_catalog_delete on public.f1_territory_street_catalog for delete using (user_id = auth.uid());

create table if not exists public.f1_territory_notes (
  note_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  civic_record_id uuid not null references public.f1_territory_civic_records(civic_record_id) on delete cascade,
  progress_id uuid references public.f1_territory_progress(progress_id) on delete set null,
  note_type text not null check (note_type in ('TEXT','AUDIO')),
  note_text text,
  audio_path text,
  audio_mime text,
  audio_duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_f1_territory_notes_civic on public.f1_territory_notes(civic_record_id, created_at desc);
create index if not exists idx_f1_territory_notes_user on public.f1_territory_notes(user_id, created_at desc);
alter table public.f1_territory_notes enable row level security;
drop policy if exists f1_territory_notes_select on public.f1_territory_notes;
create policy f1_territory_notes_select on public.f1_territory_notes for select using (f1_private.can_access_user(user_id));
drop policy if exists f1_territory_notes_insert on public.f1_territory_notes;
create policy f1_territory_notes_insert on public.f1_territory_notes for insert with check (user_id = auth.uid());
drop policy if exists f1_territory_notes_update on public.f1_territory_notes;
create policy f1_territory_notes_update on public.f1_territory_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists f1_territory_notes_delete on public.f1_territory_notes;
create policy f1_territory_notes_delete on public.f1_territory_notes for delete using (user_id = auth.uid());

create table if not exists public.f1_territory_bulletins (
  bulletin_id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text not null default 'GIORNALINO F1',
  pdf_path text not null,
  public_url text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_f1_territory_bulletins_status on public.f1_territory_bulletins(status, published_at desc);
alter table public.f1_territory_bulletins enable row level security;
drop policy if exists f1_territory_bulletins_select on public.f1_territory_bulletins;
create policy f1_territory_bulletins_select on public.f1_territory_bulletins for select using (auth.uid() is not null);
drop policy if exists f1_territory_bulletins_write on public.f1_territory_bulletins;
create policy f1_territory_bulletins_write on public.f1_territory_bulletins for all
using (exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')))
with check (exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
('f1-territory-audio','f1-territory-audio',false,15728640,array['audio/webm','audio/mp4','audio/mpeg','audio/ogg']),
('f1-territory-bulletins','f1-territory-bulletins',true,20971520,array['application/pdf'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists f1_territory_audio_insert on storage.objects;
create policy f1_territory_audio_insert on storage.objects for insert to authenticated
with check (bucket_id='f1-territory-audio' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists f1_territory_audio_select on storage.objects;
create policy f1_territory_audio_select on storage.objects for select to authenticated
using (bucket_id='f1-territory-audio' and f1_private.can_access_user(((storage.foldername(name))[1])::uuid));
drop policy if exists f1_territory_audio_delete on storage.objects;
create policy f1_territory_audio_delete on storage.objects for delete to authenticated
using (bucket_id='f1-territory-audio' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists f1_territory_bulletins_insert on storage.objects;
create policy f1_territory_bulletins_insert on storage.objects for insert to authenticated
with check (bucket_id='f1-territory-bulletins' and exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));
drop policy if exists f1_territory_bulletins_update on storage.objects;
create policy f1_territory_bulletins_update on storage.objects for update to authenticated
using (bucket_id='f1-territory-bulletins' and exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));
drop policy if exists f1_territory_bulletins_delete on storage.objects;
create policy f1_territory_bulletins_delete on storage.objects for delete to authenticated
using (bucket_id='f1-territory-bulletins' and exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));

create or replace function public.f1_territory_sync_streets_v3(p_comune text, p_streets jsonb)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_comune text:=trim(coalesce(p_comune,''));v_item jsonb;v_via text;v_count integer:=0;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  if v_comune='' then raise exception 'COMUNE OBBLIGATORIO'; end if;
  if jsonb_typeof(coalesce(p_streets,'[]'::jsonb))<>'array' then raise exception 'ELENCO VIE NON VALIDO'; end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_streets,'[]'::jsonb)) loop
    v_via:=trim(coalesce(v_item->>'via',''));
    if v_via='' then continue; end if;
    if upper(v_via) like '%AUTOSTRADA%' or upper(v_via) like '%RACCORDO AUTOSTRADALE%' or upper(v_via) in ('A32','E70') then continue; end if;
    if lower(coalesce(v_item->>'road_type','')) in ('motorway','motorway_link','trunk','trunk_link') then continue; end if;
    insert into public.f1_territory_street_catalog(user_id,comune,via,road_type,source,source_ref,status,updated_at)
    values(auth.uid(),v_comune,v_via,trim(coalesce(v_item->>'road_type','')),coalesce(nullif(trim(v_item->>'source'),''),'OPENSTREETMAP'),trim(coalesce(v_item->>'source_ref','')),'DA_INIZIARE',now())
    on conflict(user_id,comune,via) do update set road_type=excluded.road_type,source=excluded.source,source_ref=excluded.source_ref,updated_at=now();
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('ok',true,'comune',v_comune,'streets_synced',v_count);
end;$$;

create or replace function public.f1_territory_streets_v3(p_comune text)
returns jsonb language sql stable security definer set search_path to 'public','pg_temp' as $$
select coalesce(jsonb_agg(to_jsonb(x) order by x.via),'[]'::jsonb)
from (
  select s.*,coalesce(c.civic_count,0) as civic_count,c.last_record_at
  from public.f1_territory_street_catalog s
  left join lateral (
    select count(*)::integer civic_count,max(r.updated_at) last_record_at
    from public.f1_territory_civic_records r
    where r.user_id=s.user_id and lower(r.comune)=lower(s.comune) and lower(r.via)=lower(s.via)
  ) c on true
  where s.user_id=auth.uid() and lower(s.comune)=lower(trim(coalesce(p_comune,'')))
    and upper(s.via) not like '%AUTOSTRADA%' and upper(s.via) not like '%RACCORDO AUTOSTRADALE%' and upper(s.via) not in ('A32','E70')
  order by s.via
) x;$$;

create or replace function public.f1_territory_open_street_v3(p_comune text,p_via text,p_source text default 'OPENSTREETMAP',p_source_ref text default '')
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_comune text:=trim(coalesce(p_comune,''));v_via text:=trim(coalesce(p_via,''));v_progress public.f1_territory_progress%rowtype;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  if v_comune='' or v_via='' then raise exception 'COMUNE E VIA OBBLIGATORI'; end if;
  if upper(v_via) like '%AUTOSTRADA%' or upper(v_via) like '%RACCORDO AUTOSTRADALE%' or upper(v_via) in ('A32','E70') then raise exception 'STRADA ESCLUSA DAL CENSIMENTO'; end if;
  insert into public.f1_territory_street_catalog(user_id,comune,via,source,source_ref,status,updated_at)
  values(auth.uid(),v_comune,v_via,coalesce(nullif(trim(p_source),''),'OPENSTREETMAP'),trim(coalesce(p_source_ref,'')),'IN_LAVORAZIONE',now())
  on conflict(user_id,comune,via) do update set source=excluded.source,source_ref=excluded.source_ref,status='IN_LAVORAZIONE',updated_at=now();
  update public.f1_territory_progress set status='PARZIALE',updated_at=now()
  where user_id=auth.uid() and status='IN_CORSO' and not(lower(comune)=lower(v_comune) and lower(via)=lower(v_via));
  select * into v_progress from public.f1_territory_progress
  where user_id=auth.uid() and lower(comune)=lower(v_comune) and lower(via)=lower(v_via) and status<>'COMPLETATA'
  order by updated_at desc limit 1 for update;
  if not found then
    insert into public.f1_territory_progress(user_id,work_date,comune,zona,via,street_segment,civic_start,civic_end,last_civic,next_civic,status,civic_sequence,updated_by)
    values(auth.uid(),current_date,v_comune,'COMUNE',v_via,'','','','','','IN_CORSO','{}'::text[],auth.uid()) returning * into v_progress;
  else
    update public.f1_territory_progress set status='IN_CORSO',work_date=current_date,updated_at=now(),updated_by=auth.uid()
    where progress_id=v_progress.progress_id returning * into v_progress;
  end if;
  return to_jsonb(v_progress);
end;$$;

create or replace function public.f1_territory_set_manual_civic_v3(p_progress_id uuid,p_civico text)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_progress public.f1_territory_progress%rowtype;v_civico text:=trim(coalesce(p_civico,''));v_len integer;v_expected text;
begin
  if v_civico='' then raise exception 'CIVICO OBBLIGATORIO'; end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid() for update;
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  v_len:=coalesce(array_length(v_progress.civic_sequence,1),0);
  v_expected:=coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.civic_start,''),'');
  if v_len>0 and v_expected<>'' and v_expected<>v_civico then raise exception 'IL CIVICO ASSEGNATO È %.',v_expected; end if;
  update public.f1_territory_progress set next_civic=v_civico,civic_start=case when coalesce(civic_start,'')='' then v_civico else civic_start end,status='IN_CORSO',updated_at=now(),updated_by=auth.uid()
  where progress_id=p_progress_id returning * into v_progress;
  return to_jsonb(v_progress);
end;$$;

create or replace function public.f1_territory_complete_civic_v3(p_progress_id uuid,p_civico text)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_progress public.f1_territory_progress%rowtype;v_current text:=trim(coalesce(p_civico,''));v_next text:='';v_pos integer;v_len integer;v_status text:='PARZIALE';
begin
  if v_current='' then raise exception 'CIVICO OBBLIGATORIO'; end if;
  select * into v_progress from public.f1_territory_progress where progress_id=p_progress_id and user_id=auth.uid() for update;
  if not found then raise exception 'GIRO TERRITORIALE NON DISPONIBILE'; end if;
  v_len:=coalesce(array_length(v_progress.civic_sequence,1),0);
  if v_len>0 then
    if coalesce(nullif(v_progress.next_civic,''),nullif(v_progress.civic_start,''),'')<>v_current then raise exception 'IL CIVICO CORRENTE È CAMBIATO. RICARICA I DATI.'; end if;
    v_pos:=array_position(v_progress.civic_sequence,v_current);
    if v_pos is null then raise exception 'CIVICO NON PRESENTE NELLA SEQUENZA CONFIGURATA'; end if;
    if v_pos<v_len then v_next:=v_progress.civic_sequence[v_pos+1];v_status:='IN_CORSO'; else v_next:='';v_status:='DA_CONSUNTIVARE'; end if;
  end if;
  update public.f1_territory_progress set last_civic=v_current,next_civic=v_next,status=v_status,last_visit_at=now(),updated_at=now(),updated_by=auth.uid()
  where progress_id=p_progress_id returning * into v_progress;
  update public.f1_territory_street_catalog set last_civic=v_current,next_civic=v_next,status=case when v_status='DA_CONSUNTIVARE' then 'COMPLETATA' else 'IN_LAVORAZIONE' end,updated_at=now()
  where user_id=auth.uid() and lower(comune)=lower(v_progress.comune) and lower(via)=lower(v_progress.via);
  if v_progress.session_id is not null then update public.f1_territory_sessions set civici_lavorati=civici_lavorati+1 where id=v_progress.session_id and user_id=auth.uid(); end if;
  return jsonb_build_object('ok',true,'progress',to_jsonb(v_progress),'completed_civic',v_current,'next_civic',v_next,'status',v_status);
end;$$;

create or replace function public.f1_territory_note_add_v3(p_civic_record_id uuid,p_note_type text,p_note_text text default '',p_audio_path text default '',p_audio_mime text default '',p_audio_duration_seconds integer default null)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_civic public.f1_territory_civic_records%rowtype;v_note public.f1_territory_notes%rowtype;v_type text:=upper(trim(coalesce(p_note_type,'')));
begin
  if v_type not in ('TEXT','AUDIO') then raise exception 'TIPO NOTA NON VALIDO'; end if;
  select * into v_civic from public.f1_territory_civic_records where civic_record_id=p_civic_record_id and user_id=auth.uid();
  if not found then raise exception 'IMMOBILE / CIVICO NON DISPONIBILE'; end if;
  if v_type='TEXT' and trim(coalesce(p_note_text,''))='' then raise exception 'NOTA VUOTA'; end if;
  if v_type='AUDIO' and trim(coalesce(p_audio_path,''))='' then raise exception 'AUDIO MANCANTE'; end if;
  insert into public.f1_territory_notes(user_id,civic_record_id,progress_id,note_type,note_text,audio_path,audio_mime,audio_duration_seconds)
  values(auth.uid(),v_civic.civic_record_id,v_civic.progress_id,v_type,nullif(trim(coalesce(p_note_text,'')),''),nullif(trim(coalesce(p_audio_path,'')),''),nullif(trim(coalesce(p_audio_mime,'')),''),p_audio_duration_seconds)
  returning * into v_note;
  update public.f1_territory_civic_records set updated_at=now() where civic_record_id=v_civic.civic_record_id;
  return to_jsonb(v_note);
end;$$;

create or replace function public.f1_territory_bulletin_publish_v3(p_title text,p_pdf_path text,p_public_url text)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_role text;v_row public.f1_territory_bulletins%rowtype;
begin
  select upper(coalesce(role,'')) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE' limit 1;
  if v_role not in ('TITOLARE','ADMIN','MANAGER') then raise exception 'SOLO IL TITOLARE PUÒ PUBBLICARE IL GIORNALINO'; end if;
  if trim(coalesce(p_pdf_path,''))='' or trim(coalesce(p_public_url,''))='' then raise exception 'PDF GIORNALINO MANCANTE'; end if;
  update public.f1_territory_bulletins set status='ARCHIVED',updated_at=now() where status='ACTIVE';
  insert into public.f1_territory_bulletins(created_by,title,pdf_path,public_url,status,published_at)
  values(auth.uid(),coalesce(nullif(trim(p_title),''),'GIORNALINO F1'),trim(p_pdf_path),trim(p_public_url),'ACTIVE',now())
  returning * into v_row;
  return to_jsonb(v_row);
end;$$;

create or replace function public.f1_territory_mobile_crm_v3(p_limit integer default 700)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_limit integer:=greatest(1,least(coalesce(p_limit,700),1500));v_base jsonb;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  v_base:=public.f1_territory_mobile_crm_v2(v_limit);
  return v_base || jsonb_build_object(
    'notes',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select n.*,r.comune,r.zona,r.via,r.civico from public.f1_territory_notes n join public.f1_territory_civic_records r on r.civic_record_id=n.civic_record_id where f1_private.can_access_user(n.user_id) order by n.created_at desc limit v_limit) x),'[]'::jsonb),
    'streets',coalesce((select jsonb_agg(to_jsonb(x) order by x.comune,x.via) from (select * from public.f1_territory_street_catalog s where f1_private.can_access_user(s.user_id) and upper(s.via) not like '%AUTOSTRADA%' and upper(s.via) not like '%RACCORDO AUTOSTRADALE%' and upper(s.via) not in ('A32','E70') order by s.updated_at desc limit v_limit) x),'[]'::jsonb),
    'active_bulletin',(select to_jsonb(b) from public.f1_territory_bulletins b where b.status='ACTIVE' order by b.published_at desc limit 1)
  );
end;$$;

grant execute on function public.f1_territory_sync_streets_v3(text,jsonb) to authenticated;
grant execute on function public.f1_territory_streets_v3(text) to authenticated;
grant execute on function public.f1_territory_open_street_v3(text,text,text,text) to authenticated;
grant execute on function public.f1_territory_set_manual_civic_v3(uuid,text) to authenticated;
grant execute on function public.f1_territory_complete_civic_v3(uuid,text) to authenticated;
grant execute on function public.f1_territory_note_add_v3(uuid,text,text,text,text,integer) to authenticated;
grant execute on function public.f1_territory_bulletin_publish_v3(text,text,text) to authenticated;
grant execute on function public.f1_territory_mobile_crm_v3(integer) to authenticated;
