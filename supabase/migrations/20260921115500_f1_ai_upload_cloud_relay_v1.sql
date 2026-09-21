-- F1 Territory · secure cloud relay for ChatGPT uploads
-- Mobile/PWA enqueues authenticated jobs; the paired Windows bridge claims them with a one-time secret token.

create table if not exists public.f1_ai_bridge_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Windows Bridge',
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  last_error text
);

create table if not exists public.f1_ai_upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','DONE','ERROR')),
  chat_url text not null,
  prompt text not null,
  xlsx_filename text not null,
  xlsx_base64 text not null,
  json_filename text not null,
  json_text text not null,
  counts jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  last_error text,
  result jsonb not null default '{}'::jsonb
);

create index if not exists f1_ai_upload_jobs_user_status_created_idx
  on public.f1_ai_upload_jobs(user_id, status, created_at);

alter table public.f1_ai_bridge_devices enable row level security;
alter table public.f1_ai_upload_jobs enable row level security;

revoke all on table public.f1_ai_bridge_devices from anon, authenticated;
revoke all on table public.f1_ai_upload_jobs from anon, authenticated;

create or replace function public.f1_ai_bridge_pair_v1(p_label text default 'Windows Bridge')
returns table(device_id uuid, bridge_token text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.f1_ai_bridge_devices(user_id, label, token_hash, active)
  values (
    v_uid,
    coalesce(nullif(left(trim(p_label), 80), ''), 'Windows Bridge'),
    encode(digest(v_token, 'sha256'), 'hex'),
    true
  )
  returning id into v_id;

  return query select v_id, v_token;
end
$$;

create or replace function public.f1_ai_upload_enqueue_v1(
  p_chat_url text,
  p_prompt text,
  p_xlsx_filename text,
  p_xlsx_base64 text,
  p_json_filename text,
  p_json_text text,
  p_counts jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_chat_url is null or p_chat_url !~ '^https://chatgpt\.com/c/' then
    raise exception 'CHAT_URL_NON_AUTORIZZATA';
  end if;
  if coalesce(length(p_prompt),0) < 1 or length(p_prompt) > 50000 then
    raise exception 'PROMPT_NON_VALIDO';
  end if;
  if coalesce(length(p_xlsx_base64),0) < 1 or length(p_xlsx_base64) > 12000000 then
    raise exception 'XLSX_TROPPO_GRANDE_O_MANCANTE';
  end if;
  if coalesce(length(p_json_text),0) < 1 or length(p_json_text) > 12000000 then
    raise exception 'JSON_TROPPO_GRANDE_O_MANCANTE';
  end if;

  delete from public.f1_ai_upload_jobs
   where user_id = v_uid
     and (
       expires_at < now()
       or (status = 'DONE' and completed_at < now() - interval '1 hour')
       or (status = 'ERROR' and created_at < now() - interval '24 hours')
     );

  insert into public.f1_ai_upload_jobs(
    user_id, chat_url, prompt, xlsx_filename, xlsx_base64,
    json_filename, json_text, counts
  )
  values (
    v_uid, p_chat_url, p_prompt,
    regexp_replace(coalesce(nullif(p_xlsx_filename,''),'F1_TERRITORY.xlsx'),'[^A-Za-z0-9._-]','_','g'),
    p_xlsx_base64,
    regexp_replace(coalesce(nullif(p_json_filename,''),'F1_TERRITORY.json'),'[^A-Za-z0-9._-]','_','g'),
    p_json_text,
    coalesce(p_counts,'{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end
$$;

create or replace function public.f1_ai_upload_status_v1(p_job_id uuid)
returns table(
  status text,
  last_error text,
  result jsonb,
  created_at timestamptz,
  claimed_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select j.status, j.last_error, j.result, j.created_at, j.claimed_at, j.completed_at
  from public.f1_ai_upload_jobs j
  where j.id = p_job_id
    and j.user_id = auth.uid()
  limit 1
$$;

create or replace function public.f1_ai_bridge_ping_v1(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_device uuid;
begin
  if coalesce(length(p_token),0) < 40 then
    return false;
  end if;

  select d.id
    into v_device
  from public.f1_ai_bridge_devices d
  where d.active = true
    and d.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_device is null then
    return false;
  end if;

  update public.f1_ai_bridge_devices
     set last_seen_at = now(), last_error = null
   where id = v_device;

  return true;
end
$$;

create or replace function public.f1_ai_bridge_claim_job_v1(p_token text)
returns table(
  job_id uuid,
  chat_url text,
  prompt text,
  xlsx_filename text,
  xlsx_base64 text,
  json_filename text,
  json_text text,
  counts jsonb,
  retry_count integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid;
  v_device uuid;
  v_job uuid;
begin
  if coalesce(length(p_token),0) < 40 then
    return;
  end if;

  select d.user_id, d.id
    into v_uid, v_device
  from public.f1_ai_bridge_devices d
  where d.active = true
    and d.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_uid is null then
    return;
  end if;

  update public.f1_ai_bridge_devices
     set last_seen_at = now(), last_error = null
   where id = v_device;

  update public.f1_ai_upload_jobs
     set status = 'PENDING',
         retry_count = retry_count + 1,
         claimed_at = null,
         last_error = 'BRIDGE_TIMEOUT_RECOVERY'
   where user_id = v_uid
     and status = 'PROCESSING'
     and claimed_at < now() - interval '5 minutes'
     and retry_count < 2;

  update public.f1_ai_upload_jobs
     set status = 'ERROR',
         retry_count = retry_count + 1,
         completed_at = now(),
         last_error = 'BRIDGE_TIMEOUT_MAX_RETRIES'
   where user_id = v_uid
     and status = 'PROCESSING'
     and claimed_at < now() - interval '5 minutes'
     and retry_count >= 2;

  select j.id
    into v_job
  from public.f1_ai_upload_jobs j
  where j.user_id = v_uid
    and j.status = 'PENDING'
    and j.expires_at > now()
  order by j.created_at
  for update skip locked
  limit 1;

  if v_job is null then
    return;
  end if;

  update public.f1_ai_upload_jobs
     set status = 'PROCESSING', claimed_at = now()
   where id = v_job;

  return query
  select j.id, j.chat_url, j.prompt, j.xlsx_filename, j.xlsx_base64,
         j.json_filename, j.json_text, j.counts, j.retry_count
  from public.f1_ai_upload_jobs j
  where j.id = v_job;
end
$$;

create or replace function public.f1_ai_bridge_complete_job_v1(
  p_token text,
  p_job_id uuid,
  p_ok boolean,
  p_result jsonb default '{}'::jsonb,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid;
  v_device uuid;
  v_retry integer;
  v_status text;
begin
  select d.user_id, d.id
    into v_uid, v_device
  from public.f1_ai_bridge_devices d
  where d.active = true
    and d.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_uid is null then
    raise exception 'BRIDGE_TOKEN_INVALIDO';
  end if;

  select retry_count into v_retry
  from public.f1_ai_upload_jobs
  where id = p_job_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'JOB_NON_TROVATO';
  end if;

  if p_ok then
    update public.f1_ai_upload_jobs
       set status = 'DONE',
           completed_at = now(),
           last_error = null,
           result = coalesce(p_result,'{}'::jsonb),
           xlsx_base64 = '',
           json_text = '',
           prompt = ''
     where id = p_job_id and user_id = v_uid;
    v_status := 'DONE';
  else
    v_retry := coalesce(v_retry,0) + 1;
    v_status := case when v_retry < 3 then 'PENDING' else 'ERROR' end;
    update public.f1_ai_upload_jobs
       set status = v_status,
           retry_count = v_retry,
           last_error = left(coalesce(p_error,'ERRORE_BRIDGE'),2000),
           result = coalesce(p_result,'{}'::jsonb),
           claimed_at = case when v_status='PENDING' then null else claimed_at end,
           completed_at = case when v_status='ERROR' then now() else null end
     where id = p_job_id and user_id = v_uid;
  end if;

  update public.f1_ai_bridge_devices
     set last_seen_at = now(),
         last_error = case when p_ok then null else left(coalesce(p_error,'ERRORE_BRIDGE'),2000) end
   where id = v_device;

  return v_status;
end
$$;

revoke all on function public.f1_ai_bridge_pair_v1(text) from public, anon;
revoke all on function public.f1_ai_upload_enqueue_v1(text,text,text,text,text,text,jsonb) from public, anon;
revoke all on function public.f1_ai_upload_status_v1(uuid) from public, anon;
revoke all on function public.f1_ai_bridge_ping_v1(text) from public, authenticated;
revoke all on function public.f1_ai_bridge_claim_job_v1(text) from public, authenticated;
revoke all on function public.f1_ai_bridge_complete_job_v1(text,uuid,boolean,jsonb,text) from public, authenticated;

grant execute on function public.f1_ai_bridge_pair_v1(text) to authenticated;
grant execute on function public.f1_ai_upload_enqueue_v1(text,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.f1_ai_upload_status_v1(uuid) to authenticated;
grant execute on function public.f1_ai_bridge_ping_v1(text) to anon;
grant execute on function public.f1_ai_bridge_claim_job_v1(text) to anon;
grant execute on function public.f1_ai_bridge_complete_job_v1(text,uuid,boolean,jsonb,text) to anon;
