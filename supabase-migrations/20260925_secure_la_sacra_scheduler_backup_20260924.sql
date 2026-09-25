-- Sicurezza backup La Sacra Scheduler
-- La tabella è un backup tecnico e non deve essere esposta ai client browser.

alter table public.la_sacra_scheduler_backup_20260924 enable row level security;

revoke all privileges on table public.la_sacra_scheduler_backup_20260924 from public;
revoke all privileges on table public.la_sacra_scheduler_backup_20260924 from anon;
revoke all privileges on table public.la_sacra_scheduler_backup_20260924 from authenticated;

comment on table public.la_sacra_scheduler_backup_20260924 is
'Backup tecnico La Sacra del 24/09/2026. Non esposto a client anon/authenticated. Accesso riservato a ruoli backend/DB.';
