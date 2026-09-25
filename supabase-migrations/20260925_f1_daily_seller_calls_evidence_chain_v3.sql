-- F1 Daily Seller Calls v3
-- 50 telefonate solo con evidenza immobiliare:
-- FSBO/segnale venditore oppure annuncio attivo nella stessa via.
-- La RPC restituisce anche Comune, Via, motivo, immobile/notizia e URL fonte.

CREATE OR REPLACE FUNCTION public.f1_daily_seller_calls_v1(p_target_count integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_target integer := greatest(1,least(coalesce(p_target_count,100),100));
  v_existing integer := 0;
  v_needed integer := 0;
  v_rows jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_done integer := 0;
begin
  if v_user is null then
    raise exception 'ACCESSO RICHIESTO';
  end if;

  select count(*) into v_existing
  from public.tasks t
  where t.user_id=v_user
    and t.metadata->>'origin'='DAILY_SELLER_50'
    and t.metadata->>'batch_date'=v_today::text;

  v_needed := greatest(v_target-v_existing,0);

  if v_needed>0 then
    with ranked as (
      select
        l.lead_id,
        l.immobile_id,
        l.lead_score,
        l.last_contact,
        l.updated_at,
        l.source_type,
        l.lead_reason,
        l.source,
        regexp_replace(coalesce(l.telefono,''),'\D','','g') as normalized_phone,
        nullif(l.market_data#>>'{raccoglitore_payload,note}','') as trigger_note,
        nullif(l.market_data#>>'{raccoglitore_payload,segnali}','') as signal_text,
        nullif(l.market_data#>>'{raccoglitore_payload,prossimaAzione}','') as next_action,
        nullif(l.market_data#>>'{raccoglitore_payload,url}','') as contact_source_url,
        mo.id::text as linked_property_id,
        mo.indirizzo_zona as linked_property_address,
        mo.raw_title as linked_property_title,
        mo.tipologia as linked_property_type,
        mo.prezzo as linked_property_price,
        mo.source_name as linked_property_source,
        mo.source_url as linked_property_url,
        case
          when upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE') then 100
          when upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER' then 95
          when upper(concat_ws(' ',
                 l.source_type,l.lead_reason,l.source,l.status,
                 l.market_data#>>'{raccoglitore_payload,segnali}',
                 l.market_data#>>'{raccoglitore_payload,motivazione}',
                 l.market_data#>>'{raccoglitore_payload,categoria}'
               )) ~ '(VENDIT|SELLER|PROPRIET|VENDE CASA|IN_VENDITA)' then 90
          when upper(coalesce(l.source_type,''))='TERRITORY' and mo.id is not null then 88
          when upper(coalesce(l.source_type,'')) in ('PAST_CLIENT','COI','REFERRAL') and mo.id is not null then 84
          else 0
        end as selection_score,
        case
          when upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE') then 'PRIVATO / FSBO'
          when upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER' then 'POSSIBILE VENDITORE'
          when upper(concat_ws(' ',
                 l.source_type,l.lead_reason,l.source,l.status,
                 l.market_data#>>'{raccoglitore_payload,segnali}',
                 l.market_data#>>'{raccoglitore_payload,motivazione}',
                 l.market_data#>>'{raccoglitore_payload,categoria}'
               )) ~ '(VENDIT|SELLER|PROPRIET|VENDE CASA|IN_VENDITA)' then 'SEGNALE DI VENDITA'
          when upper(coalesce(l.source_type,''))='TERRITORY' and mo.id is not null then 'ANNUNCIO ATTIVO STESSA VIA'
          when upper(coalesce(l.source_type,'')) in ('PAST_CLIENT','COI','REFERRAL') and mo.id is not null then 'RELAZIONE + ANNUNCIO STESSA VIA'
          else 'SEGNALE ACQUISIZIONE'
        end as selection_reason,
        case
          when upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE') and mo.id is not null then 'FSBO+IMMOBILE_STESSA_VIA'
          when upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE') then 'FSBO'
          when upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER' and mo.id is not null then 'SELLER_SIGNAL+IMMOBILE_STESSA_VIA'
          when upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER' then 'SELLER_SIGNAL'
          when mo.id is not null then 'IMMOBILE_STESSA_VIA'
          else 'SELLER_SIGNAL'
        end as evidence_type,
        case
          when coalesce(l.market_data#>>'{raccoglitore_payload,note}','') ilike '%Trigger F1:%'
            then trim(split_part(l.market_data#>>'{raccoglitore_payload,note}','Trigger F1:',2))
          when mo.id is not null
            then concat(
              'Annuncio attivo nella stessa via: ',coalesce(mo.indirizzo_zona,''),
              case when nullif(mo.tipologia,'') is not null then ' · '||mo.tipologia else '' end,
              case when mo.prezzo is not null then ' · € '||trim(to_char(mo.prezzo,'FM999G999G999D00')) else '' end
            )
          when nullif(l.market_data#>>'{raccoglitore_payload,segnali}','') is not null
            then l.market_data#>>'{raccoglitore_payload,segnali}'
          else coalesce(nullif(l.lead_reason,''),'Ricerca immobiliare territoriale')
        end as call_reason_detail,
        case
          when mo.indirizzo_zona is not null then mo.indirizzo_zona
          when coalesce(l.market_data#>>'{raccoglitore_payload,note}','') like '%→%'
            then trim(split_part(l.market_data#>>'{raccoglitore_payload,note}','→',2))
          else ''
        end as property_reference_text,
        row_number() over (
          partition by regexp_replace(coalesce(l.telefono,''),'\D','','g')
          order by
            case
              when upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE') then 100
              when upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER' then 95
              when upper(concat_ws(' ',
                     l.source_type,l.lead_reason,l.source,l.status,
                     l.market_data#>>'{raccoglitore_payload,segnali}',
                     l.market_data#>>'{raccoglitore_payload,motivazione}',
                     l.market_data#>>'{raccoglitore_payload,categoria}'
                   )) ~ '(VENDIT|SELLER|PROPRIET|VENDE CASA|IN_VENDITA)' then 90
              when upper(coalesce(l.source_type,''))='TERRITORY' and mo.id is not null then 88
              when upper(coalesce(l.source_type,'')) in ('PAST_CLIENT','COI','REFERRAL') and mo.id is not null then 84
              else 0
            end desc,
            l.lead_score desc,
            l.updated_at desc
        ) as phone_rank
      from public.leads l
      left join lateral (
        select
          o.id,o.indirizzo_zona,o.raw_title,o.tipologia,o.prezzo,
          o.source_name,o.source_url,o.last_seen_at,o.radar_score
        from public.f1_market_opportunities o
        where upper(o.comune)=upper(l.comune)
          and upper(coalesce(o.stato_annuncio,'ATTIVO'))='ATTIVO'
          and trim(regexp_replace(regexp_replace(regexp_replace(
                upper(coalesce(l.via,'')),
                '\s*[0-9].*$',''
              ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g')) <> ''
          and trim(regexp_replace(regexp_replace(regexp_replace(
                upper(coalesce(o.indirizzo_zona,'')),
                '\s*[0-9].*$',''
              ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g'))
              =
              trim(regexp_replace(regexp_replace(regexp_replace(
                upper(coalesce(l.via,'')),
                '\s*[0-9].*$',''
              ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g'))
        order by o.last_seen_at desc nulls last, o.radar_score desc nulls last, o.created_at desc
        limit 1
      ) mo on true
      where l.user_id=v_user
        and coalesce(l.deleted,false)=false
        and nullif(regexp_replace(coalesce(l.telefono,''),'\D','','g'),'') is not null
        and coalesce(l.do_not_contact,false)=false
        and upper(coalesce(l.status,'')) not in (
          'NON_CONTATTARE','NON_INTERESSATO','SCARTATO','PERSO',
          'ACQUISITO','INCARICO','VENDUTO','ARCHIVIATO'
        )
        and upper(coalesce(l.source_type,'')) not in ('COMPETITOR_LISTING')
        and (
          upper(coalesce(l.source_type,'')) in ('FSBO','FSBO_CANDIDATE')
          or upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER'
          or upper(concat_ws(' ',
               l.source_type,l.lead_reason,l.source,l.status,
               l.market_data#>>'{raccoglitore_payload,segnali}',
               l.market_data#>>'{raccoglitore_payload,motivazione}',
               l.market_data#>>'{raccoglitore_payload,categoria}'
             )) ~ '(VENDIT|SELLER|PROPRIET|VENDE CASA|IN_VENDITA)'
          or (
            upper(coalesce(l.source_type,'')) in ('TERRITORY','PAST_CLIENT','COI','REFERRAL')
            and mo.id is not null
          )
        )
        and not exists (
          select 1
          from public.interactions i
          where i.user_id=v_user
            and i.lead_id=l.lead_id
            and (i.occurred_at at time zone 'Europe/Rome')::date=v_today
            and upper(coalesce(i.interaction_type,'')) in ('CALL','PHONE','TELEFONATA')
        )
        and not exists (
          select 1
          from public.tasks td
          where td.user_id=v_user
            and td.lead_id=l.lead_id
            and td.metadata->>'origin'='DAILY_SELLER_50'
            and td.metadata->>'batch_date'=v_today::text
        )
    ),
    candidates as (
      select *
      from ranked
      where phone_rank=1
        and selection_score>0
      order by
        selection_score desc,
        (last_contact is null) desc,
        last_contact asc nulls first,
        lead_score desc,
        updated_at asc
      limit v_needed
    )
    insert into public.tasks(
      user_id,lead_id,property_id,pillar,task_type,reason,priority,due_date,
      assigned_to,status,outcome,metadata,updated_at
    )
    select
      v_user,
      c.lead_id,
      coalesce(nullif(c.immobile_id,''),c.linked_property_id,''),
      1,
      'CALL',
      'RICERCA IMMOBILI IN VENDITA',
      least(100,greatest(1,c.selection_score))::smallint,
      (v_today + time '09:00') at time zone 'Europe/Rome',
      '',
      'OPEN',
      '',
      jsonb_build_object(
        'origin','DAILY_SELLER_50',
        'batch_date',v_today::text,
        'selection_score',c.selection_score,
        'selection_reason',c.selection_reason,
        'goal','100 TELEFONATE ALLA RICERCA DI IMMOBILI IN VENDITA',
        'evidence_type',c.evidence_type,
        'call_reason_detail',c.call_reason_detail,
        'linked_property_id',coalesce(c.linked_property_id,''),
        'linked_property_address',coalesce(nullif(c.linked_property_address,''),c.property_reference_text,''),
        'linked_property_title',coalesce(c.linked_property_title,''),
        'linked_property_type',coalesce(c.linked_property_type,''),
        'linked_property_price',coalesce(c.linked_property_price,0),
        'linked_property_source',coalesce(c.linked_property_source,''),
        'linked_property_url',coalesce(c.linked_property_url,''),
        'trigger_note',coalesce(c.trigger_note,''),
        'signal_text',coalesce(c.signal_text,''),
        'next_action',coalesce(c.next_action,'Chiamare'),
        'contact_source_url',coalesce(c.contact_source_url,'')
      ),
      now()
    from candidates c;
  end if;

  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'task_id',t.task_id,
        'lead_id',t.lead_id,
        'status',t.status,
        'priority',t.priority,
        'due_date',t.due_date,
        'reason',t.reason,
        'selection_reason',coalesce(nullif(t.metadata->>'selection_reason',''),'SEGNALE ACQUISIZIONE'),
        'selection_score',coalesce((t.metadata->>'selection_score')::integer,t.priority),
        'evidence_type',coalesce(nullif(t.metadata->>'evidence_type',''),
          case when mo.id is not null then 'IMMOBILE_STESSA_VIA' else 'SELLER_SIGNAL' end),
        'call_reason_detail',coalesce(
          nullif(t.metadata->>'call_reason_detail',''),
          case
            when coalesce(l.market_data#>>'{raccoglitore_payload,note}','') ilike '%Trigger F1:%'
              then trim(split_part(l.market_data#>>'{raccoglitore_payload,note}','Trigger F1:',2))
            when mo.id is not null
              then concat('Annuncio attivo nella stessa via: ',coalesce(mo.indirizzo_zona,''))
            else coalesce(nullif(l.market_data#>>'{raccoglitore_payload,segnali}',''),l.lead_reason)
          end
        ),
        'linked_property_id',coalesce(nullif(t.metadata->>'linked_property_id',''),mo.id::text,''),
        'linked_property_address',coalesce(
          nullif(t.metadata->>'linked_property_address',''),
          mo.indirizzo_zona,
          case when coalesce(l.market_data#>>'{raccoglitore_payload,note}','') like '%→%'
            then trim(split_part(l.market_data#>>'{raccoglitore_payload,note}','→',2)) else '' end
        ),
        'linked_property_title',coalesce(nullif(t.metadata->>'linked_property_title',''),mo.raw_title,''),
        'linked_property_type',coalesce(nullif(t.metadata->>'linked_property_type',''),mo.tipologia,''),
        'linked_property_price',coalesce(
          nullif(t.metadata->>'linked_property_price','')::numeric,
          mo.prezzo,
          0
        ),
        'linked_property_source',coalesce(nullif(t.metadata->>'linked_property_source',''),mo.source_name,''),
        'linked_property_url',coalesce(nullif(t.metadata->>'linked_property_url',''),mo.source_url,''),
        'next_action',coalesce(nullif(t.metadata->>'next_action',''),nullif(l.market_data#>>'{raccoglitore_payload,prossimaAzione}',''),'Chiamare'),
        'contact_source_url',coalesce(nullif(t.metadata->>'contact_source_url',''),nullif(l.market_data#>>'{raccoglitore_payload,url}',''),''),
        'trigger_note',coalesce(nullif(t.metadata->>'trigger_note',''),nullif(l.market_data#>>'{raccoglitore_payload,note}',''),''),
        'signal_text',coalesce(nullif(t.metadata->>'signal_text',''),nullif(l.market_data#>>'{raccoglitore_payload,segnali}',''),''),
        'nome',l.nome,
        'cognome',l.cognome,
        'telefono',l.telefono,
        'email',l.email,
        'comune',l.comune,
        'via',l.via,
        'civico',l.civico,
        'source_type',l.source_type,
        'source',l.source,
        'lead_reason',l.lead_reason,
        'last_contact',l.last_contact
      )
      order by
        (upper(coalesce(t.status,'OPEN'))='DONE') asc,
        t.priority desc,
        t.created_at asc
    ),'[]'::jsonb),
    count(*),
    count(*) filter (where upper(coalesce(t.status,'OPEN'))='DONE')
  into v_rows,v_total,v_done
  from public.tasks t
  join public.leads l
    on l.lead_id=t.lead_id
   and l.user_id=t.user_id
   and coalesce(l.deleted,false)=false
  left join lateral (
    select
      o.id,o.indirizzo_zona,o.raw_title,o.tipologia,o.prezzo,
      o.source_name,o.source_url,o.last_seen_at,o.radar_score
    from public.f1_market_opportunities o
    where upper(o.comune)=upper(l.comune)
      and upper(coalesce(o.stato_annuncio,'ATTIVO'))='ATTIVO'
      and trim(regexp_replace(regexp_replace(regexp_replace(
            upper(coalesce(l.via,'')),
            '\s*[0-9].*$',''
          ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g')) <> ''
      and trim(regexp_replace(regexp_replace(regexp_replace(
            upper(coalesce(o.indirizzo_zona,'')),
            '\s*[0-9].*$',''
          ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g'))
          =
          trim(regexp_replace(regexp_replace(regexp_replace(
            upper(coalesce(l.via,'')),
            '\s*[0-9].*$',''
          ),'[^A-ZÀ-Ü'' ]',' ','g'),'\s+',' ','g'))
    order by o.last_seen_at desc nulls last, o.radar_score desc nulls last, o.created_at desc
    limit 1
  ) mo on true
  where t.user_id=v_user
    and t.metadata->>'origin'='DAILY_SELLER_50'
    and t.metadata->>'batch_date'=v_today::text;

  return jsonb_build_object(
    'date',v_today,
    'target',v_target,
    'total',v_total,
    'done',v_done,
    'remaining',greatest(v_total-v_done,0),
    'rows',v_rows
  );
end;
$function$;
