-- Security hardening for F1 Raccoglitore -> CRM sync RPC.
revoke all on function public.f1_raccoglitore_sync_crm_v1() from public;
revoke all on function public.f1_raccoglitore_sync_crm_v1() from anon;
grant execute on function public.f1_raccoglitore_sync_crm_v1() to authenticated;

revoke all on function f1_private.sync_raccoglitore_record_to_crm_v1(text) from public;
revoke all on function f1_private.sync_raccoglitore_record_to_crm_v1(text) from anon;
revoke all on function f1_private.sync_raccoglitore_record_to_crm_v1(text) from authenticated;

revoke all on function f1_private.raccoglitore_to_crm_trigger_v1() from public;
revoke all on function f1_private.raccoglitore_to_crm_trigger_v1() from anon;
revoke all on function f1_private.raccoglitore_to_crm_trigger_v1() from authenticated;
