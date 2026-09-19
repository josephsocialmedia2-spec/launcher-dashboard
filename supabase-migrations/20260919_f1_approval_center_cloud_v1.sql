-- F1 Approval Center Cloud v1
-- Centralizes approval decisions, processing state, Seller dossier and audit trail.
-- Raw queue items remain generated from public GitHub feeds; operational state lives in Supabase.

alter table public.approval_queue
  drop constraint if exists approval_queue_status_check;

alter table public.approval_queue
  add column if not exists decision text not null default 'PENDING',
  add column if not exists decision_by uuid references auth.users(id),
  add column if not exists decision_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists processing_state jsonb not null default '{}'::jsonb,
  add column if not exists dossier jsonb not null default '{}'::jsonb,
  add column if not exists dossier_version text not null default '',
  add column if not exists error text not null default '',
  add column if not exists execution_kind text not null default '',
  add column if not exists last_transition_at timestamptz not null default now(),
  add column if not exists source_present boolean not null default true,
  add column if not exists source_last_seen_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.approval_queue'::regclass
      and conname='approval_queue_status_check'
  ) then
    alter table public.approval_queue
      add constraint approval_queue_status_check
      check (status in ('OPEN','PROCESSING','DONE','ERROR','CANCELLED'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.approval_queue'::regclass
      and conname='approval_queue_decision_check'
  ) then
    alter table public.approval_queue
      add constraint approval_queue_decision_check
      check (decision in ('PENDING','APPROVED','REJECTED'));
  end if;
end $$;

create index if not exists approval_queue_status_updated_idx
  on public.approval_queue(status, updated_at desc);
create index if not exists approval_queue_module_status_idx
  on public.approval_queue(module, status);

create table if not exists public.f1_approval_events (
  event_id bigint generated always as identity primary key,
  approval_id text not null references public.approval_queue(approval_id) on delete cascade,
  module text not null default '',
  from_status text not null default '',
  to_status text not null default '',
  from_decision text not null default '',
  to_decision text not null default '',
  action text not null default '',
  actor_user_id uuid references auth.users(id),
  error text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.f1_approval_events enable row level security;

grant select, insert, update on public.approval_queue to authenticated;
grant select, insert on public.f1_approval_events to authenticated;
grant usage, select on sequence public.f1_approval_events_event_id_seq to authenticated;

drop policy if exists approval_queue_authenticated_insert on public.approval_queue;
drop policy if exists approval_queue_authenticated_select on public.approval_queue;
drop policy if exists approval_queue_authenticated_update on public.approval_queue;
drop policy if exists approval_queue_staff_insert on public.approval_queue;
drop policy if exists approval_queue_staff_select on public.approval_queue;
drop policy if exists approval_queue_staff_update on public.approval_queue;

create policy approval_queue_staff_select
on public.approval_queue for select
to authenticated
using ((select f1_private.current_staff_role()) <> '');

create policy approval_queue_staff_insert
on public.approval_queue for insert
to authenticated
with check ((select f1_private.current_staff_role()) <> '');

create policy approval_queue_staff_update
on public.approval_queue for update
to authenticated
using ((select f1_private.current_staff_role()) <> '')
with check ((select f1_private.current_staff_role()) <> '');

drop policy if exists f1_approval_events_staff_select on public.f1_approval_events;
drop policy if exists f1_approval_events_staff_insert on public.f1_approval_events;

create policy f1_approval_events_staff_select
on public.f1_approval_events for select
to authenticated
using ((select f1_private.current_staff_role()) <> '');

create policy f1_approval_events_staff_insert
on public.f1_approval_events for insert
to authenticated
with check (
  (select f1_private.current_staff_role()) <> ''
  and (actor_user_id is null or actor_user_id = (select auth.uid()))
);

create or replace function public.f1_approval_queue_before_write()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if tg_op = 'INSERT' then
    new.last_transition_at := coalesce(new.last_transition_at, now());
  elsif new.status is distinct from old.status or new.decision is distinct from old.decision then
    new.last_transition_at := now();
  end if;

  if new.decision = 'APPROVED' and (tg_op = 'INSERT' or old.decision is distinct from 'APPROVED') then
    new.decision_by := coalesce(new.decision_by, auth.uid());
    new.decision_at := coalesce(new.decision_at, now());
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  elsif new.decision = 'REJECTED' and (tg_op = 'INSERT' or old.decision is distinct from 'REJECTED') then
    new.decision_by := coalesce(new.decision_by, auth.uid());
    new.decision_at := coalesce(new.decision_at, now());
  end if;

  if new.status = 'DONE' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'DONE' then
    new.completed_at := null;
  end if;

  return new;
end
$$;

drop trigger if exists trg_f1_approval_queue_before_write on public.approval_queue;
create trigger trg_f1_approval_queue_before_write
before insert or update on public.approval_queue
for each row execute function public.f1_approval_queue_before_write();

create or replace function public.f1_approval_queue_audit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_changed boolean;
begin
  v_changed := tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.decision is distinct from old.decision
    or new.error is distinct from old.error
    or new.dossier_version is distinct from old.dossier_version;

  if v_changed then
    insert into public.f1_approval_events(
      approval_id,module,from_status,to_status,from_decision,to_decision,
      action,actor_user_id,error,payload
    ) values (
      new.approval_id,
      new.module,
      case when tg_op='INSERT' then '' else old.status end,
      new.status,
      case when tg_op='INSERT' then '' else old.decision end,
      new.decision,
      case
        when tg_op='INSERT' then 'SOURCE_SYNC'
        when new.decision='REJECTED' and (old.decision is distinct from new.decision) then 'REJECT'
        when new.decision='APPROVED' and (old.decision is distinct from new.decision) then 'APPROVE'
        when new.status='ERROR' and (old.status is distinct from new.status) then 'ERROR'
        when new.status='DONE' and (old.status is distinct from new.status) then 'COMPLETE'
        when new.status='PROCESSING' and (old.status is distinct from new.status) then 'PROCESS'
        else 'UPDATE'
      end,
      auth.uid(),
      new.error,
      jsonb_build_object(
        'outcome',new.outcome,
        'execution_kind',new.execution_kind,
        'dossier_version',new.dossier_version
      )
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_f1_approval_queue_audit on public.approval_queue;
create trigger trg_f1_approval_queue_audit
after insert or update on public.approval_queue
for each row execute function public.f1_approval_queue_audit();
