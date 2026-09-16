create table if not exists public.f1_staff_access_log (
  access_id bigserial primary key,
  user_id uuid not null,
  occurred_at timestamptz not null default now(),
  path text not null default '',
  user_agent text not null default '',
  session_key text not null,
  source text not null default 'DASHBOARD',
  created_at timestamptz not null default now(),
  unique(user_id, session_key)
);

create index if not exists f1_staff_access_log_user_time_idx
  on public.f1_staff_access_log(user_id, occurred_at desc);

alter table public.f1_staff_access_log enable row level security;
revoke all on table public.f1_staff_access_log from anon, authenticated;
revoke all on sequence public.f1_staff_access_log_access_id_seq from anon, authenticated;

create or replace function public.f1_record_dashboard_access(
  p_path text default '',
  p_user_agent text default '',
  p_session_key text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := left(coalesce(nullif(trim(p_session_key),''), 'fallback:' || coalesce(v_uid::text,'anon') || ':' || to_char(date_trunc('minute',now()),'YYYYMMDDHH24MI')), 180);
begin
  if v_uid is null then
    raise exception 'ACCESSO AUTENTICATO RICHIESTO';
  end if;
  if not exists(select 1 from public.f1_staff_profiles where user_id=v_uid and status='ACTIVE') then
    raise exception 'PROFILO F1 NON ABILITATO';
  end if;
  insert into public.f1_staff_access_log(user_id,path,user_agent,session_key,source)
  values(v_uid,left(coalesce(p_path,''),300),left(coalesce(p_user_agent,''),700),v_key,'DASHBOARD')
  on conflict (user_id,session_key) do nothing;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.f1_staff_dashboard_roster()
returns table(
  user_id uuid,
  first_name text,
  last_name text,
  role text,
  status text,
  last_access timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and upper(p.role)='TITOLARE' and p.status='ACTIVE') then
    raise exception 'ACCESSO RISERVATO AL TITOLARE';
  end if;
  return query
  select p.user_id,p.first_name,p.last_name,p.role,p.status,
         (select max(l.occurred_at) from public.f1_staff_access_log l where l.user_id=p.user_id) as last_access,
         u.last_sign_in_at
  from public.f1_staff_profiles p
  left join auth.users u on u.id=p.user_id
  where p.status='ACTIVE'
    and upper(p.role) in ('NOTIZIERE','FUNZIONARIO','FUNZIONARIO_NOTIZIERE')
  order by p.last_name,p.first_name;
end;
$$;

create or replace function public.f1_staff_access_log(p_limit integer default 100)
returns table(
  access_id bigint,
  user_id uuid,
  first_name text,
  last_name text,
  role text,
  occurred_at timestamptz,
  path text,
  source text,
  device text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(select 1 from public.f1_staff_profiles p where p.user_id=auth.uid() and upper(p.role)='TITOLARE' and p.status='ACTIVE') then
    raise exception 'ACCESSO RISERVATO AL TITOLARE';
  end if;
  return query
  select l.access_id,l.user_id,p.first_name,p.last_name,p.role,l.occurred_at,l.path,l.source,
         case when l.user_agent ~* '(android|iphone|ipad|mobile)' then 'MOBILE' else 'DESKTOP' end as device
  from public.f1_staff_access_log l
  join public.f1_staff_profiles p on p.user_id=l.user_id
  order by l.occurred_at desc
  limit greatest(1,least(coalesce(p_limit,100),300));
end;
$$;

grant execute on function public.f1_record_dashboard_access(text,text,text) to authenticated;
grant execute on function public.f1_staff_dashboard_roster() to authenticated;
grant execute on function public.f1_staff_access_log(integer) to authenticated;
revoke execute on function public.f1_record_dashboard_access(text,text,text) from anon;
revoke execute on function public.f1_staff_dashboard_roster() from anon;
revoke execute on function public.f1_staff_access_log(integer) from anon;

insert into public.f1_staff_access_log(user_id,occurred_at,path,user_agent,session_key,source)
select p.user_id,u.last_sign_in_at,'AUTH','',
       'auth-snapshot:'||p.user_id::text||':'||extract(epoch from u.last_sign_in_at)::bigint::text,
       'AUTH_SNAPSHOT'
from public.f1_staff_profiles p
join auth.users u on u.id=p.user_id
where p.status='ACTIVE' and u.last_sign_in_at is not null
on conflict (user_id,session_key) do nothing;
