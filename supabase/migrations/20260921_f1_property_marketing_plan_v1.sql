create table if not exists public.f1_property_marketing_plans (
  plan_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  civic_record_id uuid not null references public.f1_territory_civic_records(civic_record_id) on delete cascade,
  owner_name text not null default '', owner_phone text not null default '', owner_email text not null default '',
  source_url text not null default '', source_title text not null default '', source_description text not null default '', marketing_description text not null default '',
  location_analysis jsonb not null default '{}'::jsonb, target_analysis jsonb not null default '{}'::jsonb, strategy jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb, appointments jsonb not null default '{}'::jsonb, plan_notes text not null default '',
  status text not null default 'DRAFT', brochure_path text not null default '', brochure_generated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,civic_record_id)
);
alter table public.f1_property_marketing_plans enable row level security;
drop policy if exists f1_property_marketing_plans_select_own on public.f1_property_marketing_plans;
create policy f1_property_marketing_plans_select_own on public.f1_property_marketing_plans for select to authenticated using (user_id=auth.uid());
drop policy if exists f1_property_marketing_plans_insert_own on public.f1_property_marketing_plans;
create policy f1_property_marketing_plans_insert_own on public.f1_property_marketing_plans for insert to authenticated with check (user_id=auth.uid());
drop policy if exists f1_property_marketing_plans_update_own on public.f1_property_marketing_plans;
create policy f1_property_marketing_plans_update_own on public.f1_property_marketing_plans for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists f1_property_marketing_plans_delete_own on public.f1_property_marketing_plans;
create policy f1_property_marketing_plans_delete_own on public.f1_property_marketing_plans for delete to authenticated using (user_id=auth.uid());
create or replace function public.f1_property_marketing_plan_get_v1(p_civic_record_id uuid) returns jsonb language plpgsql security invoker set search_path=public as $$ declare v jsonb; begin select to_jsonb(p) into v from public.f1_property_marketing_plans p where p.user_id=auth.uid() and p.civic_record_id=p_civic_record_id; return coalesce(v,'{}'::jsonb); end; $$;
grant execute on function public.f1_property_marketing_plan_get_v1(uuid) to authenticated;
create or replace function public.f1_property_marketing_plan_upsert_v1(p_civic_record_id uuid,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v public.f1_property_marketing_plans; begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
if not exists(select 1 from public.f1_territory_civic_records c where c.civic_record_id=p_civic_record_id and c.user_id=auth.uid()) then raise exception 'CIVIC_RECORD_NOT_FOUND'; end if;
insert into public.f1_property_marketing_plans(user_id,civic_record_id,owner_name,owner_phone,owner_email,source_url,source_title,source_description,marketing_description,location_analysis,target_analysis,strategy,documents,appointments,plan_notes,status,brochure_path,brochure_generated_at,updated_at)
values(auth.uid(),p_civic_record_id,coalesce(p_payload->>'owner_name',''),coalesce(p_payload->>'owner_phone',''),coalesce(p_payload->>'owner_email',''),coalesce(p_payload->>'source_url',''),coalesce(p_payload->>'source_title',''),coalesce(p_payload->>'source_description',''),coalesce(p_payload->>'marketing_description',''),coalesce(p_payload->'location_analysis','{}'::jsonb),coalesce(p_payload->'target_analysis','{}'::jsonb),coalesce(p_payload->'strategy','{}'::jsonb),coalesce(p_payload->'documents','{}'::jsonb),coalesce(p_payload->'appointments','{}'::jsonb),coalesce(p_payload->>'plan_notes',''),coalesce(p_payload->>'status','DRAFT'),coalesce(p_payload->>'brochure_path',''),case when nullif(p_payload->>'brochure_generated_at','') is null then null else (p_payload->>'brochure_generated_at')::timestamptz end,now())
on conflict(user_id,civic_record_id) do update set owner_name=excluded.owner_name,owner_phone=excluded.owner_phone,owner_email=excluded.owner_email,source_url=excluded.source_url,source_title=excluded.source_title,source_description=excluded.source_description,marketing_description=excluded.marketing_description,location_analysis=excluded.location_analysis,target_analysis=excluded.target_analysis,strategy=excluded.strategy,documents=excluded.documents,appointments=excluded.appointments,plan_notes=excluded.plan_notes,status=excluded.status,brochure_path=excluded.brochure_path,brochure_generated_at=excluded.brochure_generated_at,updated_at=now() returning * into v;
return to_jsonb(v); end; $$;
grant execute on function public.f1_property_marketing_plan_upsert_v1(uuid,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('f1-marketing-brochures','f1-marketing-brochures',false,10485760,array['application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;