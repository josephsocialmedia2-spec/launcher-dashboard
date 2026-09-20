-- F1 Email Radar autonomous dashboard and cron
-- Applied live on 2026-09-20.

-- Dashboard RPC now derives municipality KPIs from the canonical queue and classifies
-- READY_ZERO_CREDENTIAL / INTERACTIVE_NOT_REQUIRED / OPTIONAL_NOT_CONFIGURED correctly.

select cron.unschedule('f1-email-radar-daily-refresh')
where exists(select 1 from cron.job where jobname='f1-email-radar-daily-refresh');

select cron.schedule(
  'f1-email-radar-hourly-refresh',
  '15 * * * *',
  $job$
  select net.http_post(
    url:='https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/f1-email-radar-orchestrator',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-f1-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='f1_email_radar_cron_token' limit 1)
    ),
    body:='{"action":"CRON"}'::jsonb,
    timeout_milliseconds:=120000
  );
  $job$
);

select cron.schedule(
  'f1-email-radar-weekly-ateco-sync',
  '30 2 * * 0',
  $job$
  select net.http_post(
    url:='https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/f1-email-radar-ateco-sync',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-f1-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='f1_email_radar_cron_token' limit 1)
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=120000
  );
  $job$
);
