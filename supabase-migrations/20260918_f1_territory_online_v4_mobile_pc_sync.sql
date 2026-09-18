-- Applied in Supabase on 2026-09-18.
-- F1 Territory v4: one online CRM shared by mobile field app and PC dashboard.

alter table public.f1_territory_notes
  add column if not exists photo_path text,
  add column if not exists source_file_name text;

alter table public.f1_territory_notes
  drop constraint if exists f1_territory_notes_note_type_check;

alter table public.f1_territory_notes
  add constraint f1_territory_notes_note_type_check
  check (note_type = any (array['TEXT'::text,'AUDIO'::text,'OCR'::text]));

alter table public.f1_territory_conversations
  add column if not exists value_offer text not null default '',
  add column if not exists appointment_at timestamptz,
  add column if not exists whatsapp_sent_at timestamptz;

alter table public.f1_territory_letters
  add column if not exists pdf_filename text,
  add column if not exists pdf_downloaded_at timestamptz;

create table if not exists public.f1_territory_assets(
  asset_id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  asset_type text not null check (asset_type in ('GIORNALINO','VOLANTINO_UFFICIO','REPORT_PREZZI_ZONA')),
  title text not null default '',
  pdf_path text not null,
  public_url text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists f1_territory_assets_type_status_idx
  on public.f1_territory_assets(asset_type,status,published_at desc);

alter table public.f1_territory_assets enable row level security;

drop policy if exists f1_territory_assets_select on public.f1_territory_assets;
create policy f1_territory_assets_select on public.f1_territory_assets
for select to authenticated using (true);

drop policy if exists f1_territory_assets_insert on public.f1_territory_assets;
create policy f1_territory_assets_insert on public.f1_territory_assets
for insert to authenticated with check (
  exists(select 1 from public.f1_staff_profiles p
    where p.user_id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER'))
);

drop policy if exists f1_territory_assets_update on public.f1_territory_assets;
create policy f1_territory_assets_update on public.f1_territory_assets
for update to authenticated
using (exists(select 1 from public.f1_staff_profiles p
  where p.user_id=auth.uid() and p.status='ACTIVE'
    and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')))
with check (exists(select 1 from public.f1_staff_profiles p
  where p.user_id=auth.uid() and p.status='ACTIVE'
    and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));

drop policy if exists f1_territory_assets_delete on public.f1_territory_assets;
create policy f1_territory_assets_delete on public.f1_territory_assets
for delete to authenticated
using (exists(select 1 from public.f1_staff_profiles p
  where p.user_id=auth.uid() and p.status='ACTIVE'
    and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')));

insert into public.f1_territory_assets(created_by,asset_type,title,pdf_path,public_url,status,published_at)
select b.created_by,'GIORNALINO',b.title,b.pdf_path,b.public_url,'ACTIVE',b.published_at
from public.f1_territory_bulletins b
where b.status='ACTIVE'
  and not exists(select 1 from public.f1_territory_assets a where a.asset_type='GIORNALINO' and a.status='ACTIVE')
order by b.published_at desc
limit 1;

create or replace function public.f1_territory_asset_publish_v4(
  p_asset_type text,p_title text,p_pdf_path text,p_public_url text
) returns jsonb language plpgsql security invoker
set search_path to 'public','pg_temp' as $$
declare v_type text:=upper(trim(coalesce(p_asset_type,''))); v_role text; v_row public.f1_territory_assets%rowtype;
begin
  select upper(coalesce(role,'')) into v_role from public.f1_staff_profiles
  where user_id=auth.uid() and status='ACTIVE' limit 1;
  if v_role not in ('TITOLARE','ADMIN','MANAGER') then raise exception 'SOLO IL TITOLARE PUÒ PUBBLICARE I MATERIALI F1'; end if;
  if v_type not in ('GIORNALINO','VOLANTINO_UFFICIO','REPORT_PREZZI_ZONA') then raise exception 'TIPO MATERIALE NON VALIDO'; end if;
  if trim(coalesce(p_pdf_path,''))='' or trim(coalesce(p_public_url,''))='' then raise exception 'PDF MANCANTE'; end if;
  update public.f1_territory_assets set status='ARCHIVED',updated_at=now() where asset_type=v_type and status='ACTIVE';
  insert into public.f1_territory_assets(created_by,asset_type,title,pdf_path,public_url,status,published_at)
  values(auth.uid(),v_type,coalesce(nullif(trim(p_title),''),v_type),trim(p_pdf_path),trim(p_public_url),'ACTIVE',now())
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.f1_territory_note_add_v4(
  p_civic_record_id uuid,p_note_type text,p_note_text text default '',
  p_audio_path text default '',p_audio_mime text default '',
  p_audio_duration_seconds integer default null,p_photo_path text default '',
  p_source_file_name text default ''
) returns jsonb language plpgsql security invoker
set search_path to 'public','pg_temp' as $$
declare v_civic public.f1_territory_civic_records%rowtype; v_note public.f1_territory_notes%rowtype; v_type text:=upper(trim(coalesce(p_note_type,'')));
begin
  if v_type not in ('TEXT','AUDIO','OCR') then raise exception 'TIPO NOTA NON VALIDO'; end if;
  select * into v_civic from public.f1_territory_civic_records where civic_record_id=p_civic_record_id and user_id=auth.uid();
  if not found then raise exception 'IMMOBILE / CIVICO NON DISPONIBILE'; end if;
  if v_type in ('TEXT','OCR') and trim(coalesce(p_note_text,''))='' then raise exception 'NOTA VUOTA'; end if;
  if v_type='AUDIO' and trim(coalesce(p_audio_path,''))='' then raise exception 'AUDIO MANCANTE'; end if;
  insert into public.f1_territory_notes(user_id,civic_record_id,progress_id,note_type,note_text,audio_path,audio_mime,audio_duration_seconds,photo_path,source_file_name)
  values(auth.uid(),v_civic.civic_record_id,v_civic.progress_id,v_type,nullif(trim(coalesce(p_note_text,'')),''),nullif(trim(coalesce(p_audio_path,'')),''),nullif(trim(coalesce(p_audio_mime,'')),''),p_audio_duration_seconds,nullif(trim(coalesce(p_photo_path,'')),''),nullif(trim(coalesce(p_source_file_name,'')),''))
  returning * into v_note;
  update public.f1_territory_civic_records set updated_at=now() where civic_record_id=v_civic.civic_record_id;
  return to_jsonb(v_note);
end $$;

create or replace function public.f1_territory_conversation_add_record_v4(
  p_civic_record_id uuid,p_target_type text,p_person_name text default '',p_phone text default '',
  p_outcome text default '',p_notes text default '',p_lead_id text default null,
  p_value_offer text default '',p_appointment_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_result jsonb; v_id uuid; v_row public.f1_territory_conversations%rowtype;
begin
  v_result:=public.f1_territory_conversation_add_record_v3(p_civic_record_id,p_target_type,p_person_name,p_phone,p_outcome,p_notes,p_lead_id);
  v_id:=nullif(v_result->'conversation'->>'conversation_id','')::uuid;
  if v_id is not null then
    update public.f1_territory_conversations
    set value_offer=upper(trim(coalesce(p_value_offer,''))),
        appointment_at=case when upper(trim(coalesce(p_outcome,'')))='APPUNTAMENTO' then p_appointment_at else appointment_at end,
        updated_at=now()
    where conversation_id=v_id and user_id=auth.uid()
    returning * into v_row;
    v_result:=jsonb_set(v_result,'{conversation}',to_jsonb(v_row),true);
  end if;
  return v_result;
end $$;

create or replace function public.f1_territory_letter_update_v4(
  p_letter_id uuid,p_status text default null,p_address_text text default null,p_address_source text default null,
  p_verified boolean default false,p_pdf_filename text default null,p_pdf_downloaded boolean default false
) returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare v_base jsonb; v_row public.f1_territory_letters%rowtype;
begin
  v_base:=public.f1_territory_letter_update_v2(p_letter_id,p_status,p_address_text,p_address_source,p_verified);
  update public.f1_territory_letters
  set pdf_filename=case when p_pdf_filename is null then pdf_filename else nullif(trim(p_pdf_filename),'') end,
      pdf_downloaded_at=case when p_pdf_downloaded then now() else pdf_downloaded_at end,
      updated_at=now()
  where letter_id=p_letter_id and f1_private.can_access_user(user_id)
  returning * into v_row;
  if not found then raise exception 'LETTERA NON DISPONIBILE'; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.f1_territory_last_position_v4()
returns jsonb language sql stable security invoker set search_path to 'public','pg_temp' as $$
with last_civic as (
  select r.civic_record_id,r.progress_id,r.comune,r.zona,r.via,r.civico,r.status,r.next_action,r.updated_at
  from public.f1_territory_civic_records r where r.user_id=auth.uid() order by r.updated_at desc limit 1
), fallback_progress as (
  select p.progress_id,p.comune,p.zona,p.via,coalesce(nullif(p.last_civic,''),nullif(p.next_civic,''),'') as civico,
         p.status,''::text as next_action,p.updated_at
  from public.f1_territory_progress p where p.user_id=auth.uid() order by p.updated_at desc limit 1
)
select coalesce((select to_jsonb(x) from last_civic x),(select to_jsonb(x) from fallback_progress x),'{}'::jsonb)
$$;

create or replace function public.f1_territory_mobile_crm_v4(p_limit integer default 1000)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare v_limit integer:=greatest(1,least(coalesce(p_limit,1000),2000)); v_base jsonb;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  v_base:=public.f1_territory_mobile_crm_v3(v_limit);
  return v_base || jsonb_build_object(
    'active_assets',coalesce((select jsonb_agg(to_jsonb(a) order by a.asset_type) from (
      select distinct on (asset_type) * from public.f1_territory_assets where status='ACTIVE'
      order by asset_type,published_at desc
    ) a),'[]'::jsonb),
    'last_position',public.f1_territory_last_position_v4()
  );
end $$;

create or replace function public.f1_territory_office_dashboard_v4(p_limit integer default 1500)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare v_limit integer:=greatest(1,least(coalesce(p_limit,1500),2500)); v_base jsonb;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  v_base:=public.f1_territory_mobile_crm_v4(v_limit);
  return v_base || jsonb_build_object(
    'last_positions',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (
      select distinct on (r.user_id) r.user_id,r.civic_record_id,r.progress_id,r.comune,r.zona,r.via,r.civico,r.status,r.next_action,r.updated_at,
        trim(concat_ws(' ',p.first_name,p.last_name)) as operator_name,p.role
      from public.f1_territory_civic_records r
      left join public.f1_staff_profiles p on p.user_id=r.user_id
      where f1_private.can_access_user(r.user_id)
      order by r.user_id,r.updated_at desc
    ) x),'[]'::jsonb),
    'team',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'first_name',p.first_name,'last_name',p.last_name,'role',p.role,'status',p.status,'phone',p.phone)
      order by p.role,p.first_name,p.last_name) from public.f1_staff_profiles p
      where p.status='ACTIVE' and f1_private.can_access_user(p.user_id)),'[]'::jsonb)
  );
end $$;

revoke execute on function public.f1_territory_asset_publish_v4(text,text,text,text) from public,anon;
revoke execute on function public.f1_territory_note_add_v4(uuid,text,text,text,text,integer,text,text) from public,anon;
revoke execute on function public.f1_territory_conversation_add_record_v4(uuid,text,text,text,text,text,text,text,timestamptz) from public,anon;
revoke execute on function public.f1_territory_letter_update_v4(uuid,text,text,text,boolean,text,boolean) from public,anon;
revoke execute on function public.f1_territory_last_position_v4() from public,anon;
revoke execute on function public.f1_territory_mobile_crm_v4(integer) from public,anon;
revoke execute on function public.f1_territory_office_dashboard_v4(integer) from public,anon;

grant execute on function public.f1_territory_asset_publish_v4(text,text,text,text) to authenticated;
grant execute on function public.f1_territory_note_add_v4(uuid,text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.f1_territory_conversation_add_record_v4(uuid,text,text,text,text,text,text,text,timestamptz) to authenticated;
grant execute on function public.f1_territory_letter_update_v4(uuid,text,text,text,boolean,text,boolean) to authenticated;
grant execute on function public.f1_territory_last_position_v4() to authenticated;
grant execute on function public.f1_territory_mobile_crm_v4(integer) to authenticated;
grant execute on function public.f1_territory_office_dashboard_v4(integer) to authenticated;
