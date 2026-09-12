-- F1 Acquisition Engine — Phase B
-- Requires an active public.territories snapshot. The browser syncs that snapshot
-- from canonical config/territory.json after authenticated access.

-- Historical observations must allow the same listing URL to be observed many times.
drop index if exists public.property_obs_user_source_unique;
create index if not exists property_obs_user_source_time_idx
  on public.property_observations(user_id,source_url,observed_at desc);

create or replace function public.f1_market_opportunity_capture()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_cfg jsonb;
  v_allowed boolean := false;
  v_property_id text;
  v_source_id text;
  v_fingerprint text;
  v_last_fingerprint text;
  v_lead_id text;
  v_event_id uuid;
begin
  select user_id,config into v_user,v_cfg
  from public.territories
  where active=true
  order by created_at desc
  limit 1;

  if v_user is null or v_cfg is null or nullif(trim(new.comune),'') is null or nullif(trim(new.source_url),'') is null then
    return new;
  end if;

  v_allowed := lower(trim(new.comune)) = lower(trim(v_cfg->>'reference_hub'))
    or exists (select 1 from jsonb_array_elements_text(coalesce(v_cfg->'sinistra','[]'::jsonb)) x where lower(trim(x))=lower(trim(new.comune)))
    or exists (select 1 from jsonb_array_elements_text(coalesce(v_cfg->'destra','[]'::jsonb)) x where lower(trim(x))=lower(trim(new.comune)));
  if not v_allowed then return new; end if;

  v_property_id := 'legacy-prop-' || substr(md5(new.source_url),1,20);
  v_source_id := 'legacy-market-' || substr(md5(lower(coalesce(new.source_name,'unknown'))),1,20);
  v_fingerprint := md5(concat_ws('|',new.source_url,coalesce(new.prezzo::text,''),coalesce(new.mq::text,''),coalesce(new.stato_annuncio,''),coalesce(new.seller_signal,''),coalesce(new.last_seen_at::text,'')));

  insert into public.sources(source_id,user_id,source_type,name,is_public,requires_manual_access,notes)
  values(v_source_id,v_user,'MARKET_PORTAL',coalesce(new.source_name,'Fonte mercato'),true,false,'Acquisizione automatica da f1_market_opportunities')
  on conflict (source_id) do update set updated_at=now();

  insert into public.properties(property_id,user_id,comune,via,tipologia,caratteristiche,first_seen,last_seen,status,fingerprint,created_at,updated_at)
  values(v_property_id,v_user,new.comune,coalesce(new.indirizzo_zona,''),coalesce(new.tipologia,''),
    jsonb_strip_nulls(jsonb_build_object('mq',new.mq,'locali',new.locali,'camere',new.camere,'giardino',new.giardino,'box',new.box,'ascensore',new.ascensore,'stato_immobile',new.stato_immobile)),
    coalesce(new.created_at,now()),coalesce(new.last_seen_at,now()),case when new.stato_annuncio='ATTIVO' then 'OSSERVATO' else 'DA_VERIFICARE' end,
    md5(lower(coalesce(new.comune,'')||'|'||coalesce(new.indirizzo_zona,'')||'|'||coalesce(new.tipologia,'')||'|'||new.source_url)),coalesce(new.created_at,now()),now())
  on conflict (property_id) do update set comune=excluded.comune,via=excluded.via,tipologia=excluded.tipologia,caratteristiche=excluded.caratteristiche,last_seen=excluded.last_seen,status=excluded.status,fingerprint=excluded.fingerprint,updated_at=now();

  select po.fingerprint into v_last_fingerprint
  from public.property_observations po
  where po.user_id=v_user and po.property_id=v_property_id
  order by po.observed_at desc,po.created_at desc
  limit 1;

  if v_last_fingerprint is distinct from v_fingerprint then
    insert into public.property_observations(user_id,property_id,observed_at,source_id,source_url,portal,listing_status,asking_price,surface_mq,fingerprint,evidence,confidence)
    values(v_user,v_property_id,coalesce(new.last_seen_at,now()),v_source_id,new.source_url,coalesce(new.source_name,''),coalesce(nullif(new.stato_annuncio,''),'ONLINE'),new.prezzo,new.mq,v_fingerprint,
      jsonb_strip_nulls(jsonb_build_object('legacy_id',new.id,'external_id',new.external_id,'seller_signal',new.seller_signal,'radar_score',new.radar_score,'radar_priority',new.radar_priority,'raw_title',new.raw_title)),
      case when new.seller_signal in ('INDIZIO_PRIVATO','INDIZIO_AGENZIA') then 'MEDIUM' else 'LOW' end);
  end if;

  if tg_op='UPDATE' and old.prezzo is distinct from new.prezzo and new.prezzo is not null then
    insert into public.events(user_id,event_type,pillar,property_id,source_id,evidence_url,evidence_type,evidence,confidence,occurred_at)
    values(v_user,'PROPERTY_PRICE_CHANGED',1,v_property_id,v_source_id,new.source_url,'PRICE_CHANGE',jsonb_build_object('old_price',old.prezzo,'new_price',new.prezzo),'HIGH',now());
  end if;

  if new.seller_signal='INDIZIO_PRIVATO' and (tg_op='INSERT' or old.seller_signal is distinct from new.seller_signal) then
    v_lead_id := 'legacy-private-' || substr(md5(new.source_url),1,20);
    insert into public.leads(lead_id,user_id,pillar,source_type,source,source_url,created_at,first_seen,last_seen,comune,via,immobile_id,lead_reason,lead_score,confidence,status,next_action,notes,privacy_basis,rpo_status,created_by,updated_at)
    values(v_lead_id,v_user,1,'MARKET_SIGNAL',coalesce(new.source_name,''),new.source_url,now(),now(),coalesce(new.last_seen_at,now()),new.comune,coalesce(new.indirizzo_zona,''),v_property_id,'INDIZIO_PRIVATO_DA_VERIFICARE',least(100,greatest(0,coalesce(new.radar_score,50))),'MEDIUM','DA_VERIFICARE','VERIFICA SEGNALE PRIVATO E REQUISITI DI CONTATTO','Segnale di mercato: non classificare automaticamente come FSBO verificato.','LEGITIMATE_INTEREST_REQUIRES_CONTACT_CHECK','DA_VERIFICARE','market_trigger',now())
    on conflict (lead_id) do update set last_seen=excluded.last_seen,lead_score=excluded.lead_score,updated_at=now();

    select e.event_id into v_event_id
    from public.events e
    where e.user_id=v_user and e.lead_id=v_lead_id and e.evidence_url=new.source_url and e.event_type='FSBO_CANDIDATE_FOUND'
    order by e.created_at desc limit 1;
    if v_event_id is null then
      insert into public.events(user_id,event_type,pillar,lead_id,property_id,source_id,evidence_url,evidence_type,evidence,confidence,occurred_at)
      values(v_user,'FSBO_CANDIDATE_FOUND',1,v_lead_id,v_property_id,v_source_id,new.source_url,'MARKET_PRIVATE_SIGNAL',jsonb_build_object('seller_signal',new.seller_signal,'rule','verifica manuale obbligatoria'),'MEDIUM',now())
      returning event_id into v_event_id;
    end if;

    if not exists(select 1 from public.tasks t where t.user_id=v_user and t.lead_id=v_lead_id and t.task_type='VERIFY' and t.status in ('OPEN','IN_PROGRESS')) then
      insert into public.tasks(user_id,lead_id,property_id,event_id,pillar,task_type,reason,priority,due_date,status,metadata)
      values(v_user,v_lead_id,v_property_id,v_event_id,1,'VERIFY','Verifica segnale privato, fonte e requisiti di contatto',least(100,greatest(0,coalesce(new.radar_score,50))),now(),'OPEN',jsonb_build_object('source_url',new.source_url,'comune',new.comune,'via',coalesce(new.indirizzo_zona,''),'core_category','FSBO_CANDIDATE','contact_gate','RPO_AND_EVIDENCE_REQUIRED'));
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.f1_market_opportunity_capture() from public, anon, authenticated;
drop trigger if exists f1_market_opportunity_capture_trg on public.f1_market_opportunities;
create trigger f1_market_opportunity_capture_trg
after insert or update of prezzo,mq,stato_annuncio,seller_signal,last_seen_at,indirizzo_zona,tipologia
on public.f1_market_opportunities
for each row execute function public.f1_market_opportunity_capture();
