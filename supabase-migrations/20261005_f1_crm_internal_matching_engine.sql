-- F1 CRM internal demand/supply matching engine
-- Applied to production on 2026-10-05.
create or replace view public.f1_crm_match_scores
with (security_invoker = true)
as
select
  r.request_id,r.user_id,r.lead_id,
  trim(concat_ws(' ',l.nome,l.cognome)) as nome,l.telefono,l.email,
  r.comune as target_comune,r.zone,r.tipologia as richiesta_tipologia,
  r.budget_min,r.budget_max,r.mq_min,r.camere as richiesta_camere,r.bagni as richiesta_bagni,
  r.piano as richiesta_piano,r.ascensore as richiesta_ascensore,r.box as richiesta_box,
  r.posto_auto as richiesta_posto_auto,r.giardino as richiesta_giardino,r.terrazzo as richiesta_terrazzo,
  r.urgenza,o.id as opportunity_id,o.source_name,o.source_url,o.comune as opportunity_comune,
  o.indirizzo_zona,o.prezzo,o.mq,o.tipologia as opportunity_tipologia,o.camere as opportunity_camere,
  o.giardino as opportunity_giardino,o.box as opportunity_box,o.ascensore as opportunity_ascensore,
  o.raw_title,o.radar_score,o.radar_priority,o.seller_signal,o.last_seen_at,
  greatest(0,least(100,
    case when lower(trim(r.comune))=lower(trim(o.comune)) then 30
         when exists(select 1 from unnest(coalesce(r.zone,array[]::text[])) z where lower(trim(z))=lower(trim(o.comune))) then 20 else 0 end
    + case when r.budget_max is null or o.prezzo is null then 5
           when o.prezzo between coalesce(r.budget_min,0) and r.budget_max then 22
           when o.prezzo<=r.budget_max*1.05 then 16 when o.prezzo<=r.budget_max*1.10 then 8 else 0 end
    + case when nullif(trim(r.tipologia),'') is null or nullif(trim(o.tipologia),'') is null then 5
           when lower(o.tipologia) like '%'||lower(r.tipologia)||'%' or lower(r.tipologia) like '%'||lower(o.tipologia)||'%' then 15 else 0 end
    + case when r.mq_min is null or o.mq is null then 3 when o.mq>=r.mq_min then 8 when o.mq>=r.mq_min*0.9 then 4 else 0 end
    + case when r.camere is null or o.camere is null then 2 when o.camere>=r.camere then 5 else 0 end
    + case when r.box is null then 1 when r.box=false or o.box=true then 4 else 0 end
    + case when r.giardino is null then 1 when r.giardino=false or o.giardino=true then 4 else 0 end
    + case when r.ascensore is null then 1 when r.ascensore=false or o.ascensore=true then 3 else 0 end
    + case when o.stato_annuncio='ATTIVO' then 3 else -100 end
  ))::numeric as match_score
from public.f1_crm_requests r
join public.leads l on l.lead_id=r.lead_id and l.user_id=r.user_id and not l.deleted
join public.f1_market_opportunities o on o.stato_annuncio='ATTIVO'
where r.request_status='ACTIVE';
revoke all on public.f1_crm_match_scores from anon;
grant select on public.f1_crm_match_scores to authenticated;
