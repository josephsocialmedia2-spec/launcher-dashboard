-- F1 Email Acquisition Engine
-- Applied live on 2026-09-20.
-- Reuses F1 Email Radar + existing campaign tables. Public radar emails are never auto-promoted into marketing contacts.

create table if not exists public.f1_email_acquisition_leads (
  acquisition_id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.f1_email_radar_entities(entity_id) on delete cascade,
  campaign_key text not null default '_RESEARCH_',
  campaign_id uuid null references public.email_campaigns(id) on delete set null,
  contact_id uuid null references public.email_marketing_contacts(id) on delete set null,
  recipient_id uuid null references public.email_campaign_recipients(id) on delete set null,
  company_name text not null default '',
  email text not null default '',
  email_status text not null default 'NON_VERIFICATA'
    check (email_status in ('VERIFICATA','NON_VERIFICATA','RISCHIOSA','INVALIDA','DUPLICATA','SOPPRESSA')),
  state text not null default 'NEW'
    check (state in ('NEW','DATA_CHECK','QUALIFIED','COMPLIANCE_CHECK','READY','CONTACTED','FOLLOW_UP','REPLIED','QUALIFIED_REPLY','BOOKING','BOOKED','SHOWED','OPPORTUNITY','CUSTOMER','INVALID','NOT_INTERESTED','DO_NOT_CONTACT','NO_SHOW','PAUSED')),
  qualification_status text not null default 'PENDING',
  compliance_status text not null default 'REVIEW_REQUIRED'
    check (compliance_status in ('REVIEW_REQUIRED','CONSENT_REQUIRED','ELIGIBLE_CONSENT','REVIEW_SOFT_SPAM','SUPPRESSED','DO_NOT_CONTACT','NO_EMAIL','PEC_ONLY','BLOCKED_SOURCE')),
  compliance_basis text not null default '',
  do_not_contact boolean not null default false,
  icp_score smallint null check (icp_score between 0 and 100),
  buyer_persona_score smallint null check (buyer_persona_score between 0 and 100),
  trigger_score smallint null check (trigger_score between 0 and 100),
  recency_score smallint null check (recency_score between 0 and 100),
  data_quality_score smallint null check (data_quality_score between 0 and 100),
  economic_potential_score smallint null check (economic_potential_score between 0 and 100),
  lead_priority_score smallint null check (lead_priority_score between 0 and 100),
  trigger_text text not null default '',
  trigger_source text not null default '',
  trigger_date date null,
  buyer_persona jsonb not null default '{}'::jsonb,
  sequence_step smallint not null default 0,
  last_contact_at timestamptz null,
  last_reply_at timestamptz null,
  next_action text not null default '',
  next_action_at timestamptz null,
  reply_classification text not null default '',
  appointment_status text not null default '',
  appointment_start timestamptz null,
  owner text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id,campaign_key)
);

create index if not exists f1_email_acquisition_leads_state_idx
  on public.f1_email_acquisition_leads(state,next_action_at);
create index if not exists f1_email_acquisition_leads_compliance_idx
  on public.f1_email_acquisition_leads(compliance_status,do_not_contact);
create index if not exists f1_email_acquisition_leads_email_idx
  on public.f1_email_acquisition_leads(lower(email)) where email<>'';

create table if not exists public.f1_email_acquisition_events (
  event_id bigint generated always as identity primary key,
  acquisition_id uuid null references public.f1_email_acquisition_leads(acquisition_id) on delete cascade,
  entity_id uuid null references public.f1_email_radar_entities(entity_id) on delete set null,
  campaign_key text not null default '_RESEARCH_',
  event_type text not null,
  reason text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.f1_email_acquisition_kpi_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  campaign_key text not null default '_RESEARCH_',
  contacts integer not null default 0,
  ready integer not null default 0,
  consent_required integer not null default 0,
  suppressed integer not null default 0,
  sent integer not null default 0,
  replies integer not null default 0,
  positive_replies integer not null default 0,
  booked integer not null default 0,
  showed integer not null default 0,
  opportunities integer not null default 0,
  customers integer not null default 0,
  bounced integer not null default 0,
  opt_out integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.f1_email_acquisition_leads enable row level security;
alter table public.f1_email_acquisition_events enable row level security;
alter table public.f1_email_acquisition_kpi_snapshots enable row level security;

revoke all on public.f1_email_acquisition_leads from public,anon,authenticated;
revoke all on public.f1_email_acquisition_events from public,anon,authenticated;
revoke all on public.f1_email_acquisition_kpi_snapshots from public,anon,authenticated;
grant all on public.f1_email_acquisition_leads to service_role;
grant all on public.f1_email_acquisition_events to service_role;
grant all on public.f1_email_acquisition_kpi_snapshots to service_role;
grant usage,select on sequence public.f1_email_acquisition_events_event_id_seq to service_role;

insert into public.f1_email_radar_runtime_config(key,value,updated_at) values
 ('acquisition_active_campaign_key','',now()),
 ('acquisition_send_enabled','false',now()),
 ('acquisition_compliance_mode','STRICT_CONSENT',now()),
 ('acquisition_followup_days','0,3,7,14',now()),
 ('acquisition_max_daily_contacts','20',now())
on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

select cron.unschedule('f1-email-acquisition-hourly-cycle')
where exists(select 1 from cron.job where jobname='f1-email-acquisition-hourly-cycle');

select cron.schedule(
  'f1-email-acquisition-hourly-cycle',
  '35 * * * *',
  $job$
  select net.http_post(
    url:='https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/f1-email-acquisition-engine',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-f1-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='f1_email_radar_cron_token' limit 1)
    ),
    body:='{"action":"CRON"}'::jsonb,
    timeout_milliseconds:=120000
  );
  $job$
);
