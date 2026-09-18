-- Security hardening for F1 Territory CRM sync v5.
-- Keep RPCs callable only by signed-in staff.

revoke all on function public.f1_territory_mobile_crm_v5(integer) from public;
revoke all on function public.f1_territory_mobile_crm_v5(integer) from anon;
grant execute on function public.f1_territory_mobile_crm_v5(integer) to authenticated;

revoke all on function public.f1_territory_office_dashboard_v5(integer) from public;
revoke all on function public.f1_territory_office_dashboard_v5(integer) from anon;
grant execute on function public.f1_territory_office_dashboard_v5(integer) to authenticated;
