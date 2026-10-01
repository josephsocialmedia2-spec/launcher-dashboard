create table if not exists public.f1_contact_outreach_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_ref text not null default '',
  channel text not null check (channel in ('CALL','MESSAGE')),
  occurred_at timestamptz not null default now(),
  source text not null default '',
  source_event_id text not null,
  display_name text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_event_id)
);

alter table public.f1_contact_outreach_events enable row level security;

drop policy if exists f1_contact_outreach_select_own on public.f1_contact_outreach_events;
create policy f1_contact_outreach_select_own
on public.f1_contact_outreach_events
for select to authenticated
using (user_id = auth.uid());

drop policy if exists f1_contact_outreach_insert_own on public.f1_contact_outreach_events;
create policy f1_contact_outreach_insert_own
on public.f1_contact_outreach_events
for insert to authenticated
with check (user_id = auth.uid());

create or replace function public.f1_record_contact_outreach_v1(
  p_channel text,
  p_source_event_id text,
  p_contact_ref text default '',
  p_source text default '',
  p_display_name text default '',
  p_occurred_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.f1_contact_outreach_events%rowtype;
  v_channel text := upper(coalesce(p_channel,''));
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if v_channel not in ('CALL','MESSAGE') then
    raise exception 'CHANNEL_NOT_ALLOWED';
  end if;
  if nullif(trim(coalesce(p_source_event_id,'')),'') is null then
    raise exception 'SOURCE_EVENT_ID_REQUIRED';
  end if;

  insert into public.f1_contact_outreach_events(
    user_id,contact_ref,channel,occurred_at,source,source_event_id,display_name,metadata
  )
  values(
    v_user,coalesce(p_contact_ref,''),v_channel,coalesce(p_occurred_at,now()),
    coalesce(p_source,''),p_source_event_id,coalesce(p_display_name,''),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (user_id,source_event_id) do nothing;

  select * into v_row
  from public.f1_contact_outreach_events
  where user_id=v_user and source_event_id=p_source_event_id
  limit 1;

  return to_jsonb(v_row);
end
$$;

create or replace function public.f1_daily_contact_outreach_v1(
  p_day date default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := coalesce(p_day,(now() at time zone 'Europe/Rome')::date);
  v_start timestamptz := (v_day::timestamp at time zone 'Europe/Rome');
  v_end timestamptz := ((v_day + 1)::timestamp at time zone 'Europe/Rome');
  v_events jsonb;
  v_total integer;
  v_calls integer;
  v_messages integer;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    count(*)::int,
    count(*) filter (where channel='CALL')::int,
    count(*) filter (where channel='MESSAGE')::int,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'event_id',event_id,
        'channel',channel,
        'occurred_at',occurred_at,
        'source',source,
        'source_event_id',source_event_id,
        'contact_ref',contact_ref,
        'display_name',display_name,
        'metadata',metadata
      )
      order by occurred_at,created_at,event_id
    ),'[]'::jsonb)
  into v_total,v_calls,v_messages,v_events
  from public.f1_contact_outreach_events
  where user_id=v_user
    and occurred_at>=v_start
    and occurred_at<v_end;

  return jsonb_build_object(
    'day',v_day,
    'timezone','Europe/Rome',
    'total',coalesce(v_total,0),
    'calls',coalesce(v_calls,0),
    'messages',coalesce(v_messages,0),
    'events',v_events
  );
end
$$;

grant select,insert on public.f1_contact_outreach_events to authenticated;
grant execute on function public.f1_record_contact_outreach_v1(text,text,text,text,text,timestamptz,jsonb) to authenticated;
grant execute on function public.f1_daily_contact_outreach_v1(date) to authenticated;
