-- F1 CRM OS P1 — additive contact roles + duplicate precheck
-- Applied to production through Supabase migration tooling on 2026-09-13.

create table if not exists public.f1_contact_roles (
  role_id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(lead_id) on delete restrict,
  role_type text not null check (role_type in ('PROPRIETARIO','VENDITORE','ACQUIRENTE','LOCATORE','CONDUTTORE','PROSPECT','EX_CLIENTE','SEGNALATORE','CONTATTO_TERRITORIALE','CENTRO_INFLUENZA')),
  role_status text not null default 'ACTIVE' check (role_status in ('ACTIVE','INACTIVE','MERGED','ARCHIVED')),
  pipeline_stage text not null default '',
  is_primary boolean not null default false,
  created_by_user_id uuid not null default auth.uid() references auth.users(id),
  source text not null default 'MANUAL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lead_id, role_type)
);

create index if not exists idx_f1_contact_roles_lead on public.f1_contact_roles(lead_id);
create index if not exists idx_f1_contact_roles_type_stage on public.f1_contact_roles(role_type,pipeline_stage) where role_status='ACTIVE';

alter table public.f1_contact_roles enable row level security;
revoke all on public.f1_contact_roles from anon;
grant select,insert,update on public.f1_contact_roles to authenticated;
revoke delete on public.f1_contact_roles from authenticated;

create policy "f1 contact roles visible through lead" on public.f1_contact_roles
for select to authenticated
using (exists (select 1 from public.leads l where l.lead_id=f1_contact_roles.lead_id));

create policy "f1 contact roles insert through lead" on public.f1_contact_roles
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and created_by_user_id=(select auth.uid())
  and exists (select 1 from public.leads l where l.lead_id=f1_contact_roles.lead_id)
);

create policy "f1 contact roles update through lead" on public.f1_contact_roles
for update to authenticated
using (exists (select 1 from public.leads l where l.lead_id=f1_contact_roles.lead_id))
with check (exists (select 1 from public.leads l where l.lead_id=f1_contact_roles.lead_id));

create or replace function public.f1_find_duplicate_candidates(p_payload jsonb)
returns table(lead_id text, display_name text, comune text, status text, matched_by text[], updated_at timestamptz)
language sql
security invoker
set search_path=public,pg_temp
as $$
with q as (
  select regexp_replace(coalesce(p_payload->>'telefono',''),'[^0-9+]','','g') phone,
         lower(trim(coalesce(p_payload->>'email',''))) email,
         lower(trim(coalesce(p_payload->>'nome',''))) nome,
         lower(trim(coalesce(p_payload->>'cognome',''))) cognome,
         lower(trim(coalesce(p_payload->>'comune',''))) comune,
         lower(trim(coalesce(p_payload->>'via',''))) via
), candidates as (
  select l.*,
    array_remove(array[
      case when q.phone<>'' and regexp_replace(coalesce(l.telefono,''),'[^0-9+]','','g')=q.phone then 'TELEFONO' end,
      case when q.email<>'' and lower(trim(coalesce(l.email,'')))=q.email then 'EMAIL' end,
      case when q.nome<>'' and q.cognome<>'' and q.comune<>'' and lower(trim(coalesce(l.nome,'')))=q.nome and lower(trim(coalesce(l.cognome,'')))=q.cognome and lower(trim(coalesce(l.comune,'')))=q.comune then 'NOME_COGNOME_COMUNE' end,
      case when q.via<>'' and q.comune<>'' and lower(trim(coalesce(l.via,'')))=q.via and lower(trim(coalesce(l.comune,'')))=q.comune then 'INDIRIZZO_COMUNE' end
    ],null) why
  from public.leads l cross join q
  where not l.deleted and (
    (q.phone<>'' and regexp_replace(coalesce(l.telefono,''),'[^0-9+]','','g')=q.phone)
    or (q.email<>'' and lower(trim(coalesce(l.email,'')))=q.email)
    or (q.nome<>'' and q.cognome<>'' and q.comune<>'' and lower(trim(coalesce(l.nome,'')))=q.nome and lower(trim(coalesce(l.cognome,'')))=q.cognome and lower(trim(coalesce(l.comune,'')))=q.comune)
    or (q.via<>'' and q.comune<>'' and lower(trim(coalesce(l.via,'')))=q.via and lower(trim(coalesce(l.comune,'')))=q.comune)
  )
)
select c.lead_id, trim(concat_ws(' ',c.nome,c.cognome)), c.comune, c.status, c.why, c.updated_at
from candidates c
order by cardinality(c.why) desc,c.updated_at desc
limit 10;
$$;

grant execute on function public.f1_find_duplicate_candidates(jsonb) to authenticated;
revoke all on function public.f1_find_duplicate_candidates(jsonb) from anon;
