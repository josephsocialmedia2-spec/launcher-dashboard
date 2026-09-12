-- F1 Seller Radar mandatory CRM coverage
-- Live logic applied 2026-09-12. This migration documents the operational rule.
-- Every eligible market observation must be linked to one CRM lead.

-- Canonical classifications expected by the live trigger:
-- COMPETITOR_LISTING     -> MONITORAGGIO_CONCORRENZA / MONITOR
-- MARKET_LISTING         -> DA_ANALIZZARE / VERIFY
-- FSBO_CANDIDATE         -> DA_VERIFICARE / VERIFY
-- EXPIRED_CANDIDATE      -> DA_VERIFICARE / VERIFY
-- EXPIRED_VERIFIED       -> DA_VERIFICARE / VERIFY
--
-- Contact remains gated by evidence + RPO/DNC requirements.
-- The live function public.f1_market_opportunity_capture() is SECURITY DEFINER
-- only for trigger execution; EXECUTE is revoked from PUBLIC, anon and authenticated.

revoke all on function public.f1_market_opportunity_capture() from public;
revoke all on function public.f1_market_opportunity_capture() from anon;
revoke all on function public.f1_market_opportunity_capture() from authenticated;
