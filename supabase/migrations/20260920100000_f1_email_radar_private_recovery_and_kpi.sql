-- F1 Email Radar private recovery helper + duplicate KPI
-- Applied live on 2026-09-20.

create or replace function f1_private.email_radar_internal_call(
  p_action text,
  p_run_id uuid default null,
  p_comune text default null
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,extensions,vault
as $$
declare
  v_token text;
  v_body jsonb;
  v_resp extensions.http_response;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS','120000');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS','10000');
  select decrypted_secret into v_token from vault.decrypted_secrets
  where name='f1_email_radar_cron_token' limit 1;
  if coalesce(v_token,'')='' then raise exception 'EMAIL_RADAR_CRON_TOKEN_MISSING'; end if;
  v_body=jsonb_strip_nulls(jsonb_build_object('action',upper(p_action),'run_id',p_run_id,'comune',p_comune));
  select * into v_resp
  from extensions.http((
    'POST',
    'https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/f1-email-radar-orchestrator',
    array[
      extensions.http_header('Content-Type','application/json'),
      extensions.http_header('x-f1-cron-token',v_token)
    ],
    'application/json',
    v_body::text
  )::extensions.http_request);
  if v_resp.status < 200 or v_resp.status >= 300 then
    raise exception 'EMAIL_RADAR_HTTP_%: %',v_resp.status,v_resp.content;
  end if;
  return v_resp.content::jsonb;
end $$;
revoke all on function f1_private.email_radar_internal_call(text,uuid,text) from public,anon,authenticated,service_role;

-- f1_email_radar_recalc_run now derives duplicates_merged from
-- f1_email_radar_source_progress.duplicates, so KPI reflects provider merges.
