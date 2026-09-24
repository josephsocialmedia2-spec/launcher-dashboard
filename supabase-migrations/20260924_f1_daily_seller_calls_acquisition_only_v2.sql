-- F1: restringe la lista "50 telefonate di oggi" ai soli contatti utili
-- alla ricerca/acquisizione di immobili in vendita.
-- Esclude il riempimento generico PROSPEZIONE CRM.

do $do$
declare
  v_def text;
  v_old text := $old$        and upper(coalesce(l.source_type,'')) not in ('COMPETITOR_LISTING')
        and not exists ($old$;
  v_new text := $new$        and upper(coalesce(l.source_type,'')) not in ('COMPETITOR_LISTING')
        and (
          upper(coalesce(l.source_type,'')) in (
            'FSBO','FSBO_CANDIDATE','TERRITORY','PAST_CLIENT','COI','REFERRAL'
          )
          or upper(coalesce(l.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER'
          or upper(concat_ws(' ',
               l.source_type,l.lead_reason,l.source,l.status,
               l.market_data#>>'{raccoglitore_payload,segnali}',
               l.market_data#>>'{raccoglitore_payload,motivazione}',
               l.market_data#>>'{raccoglitore_payload,categoria}'
             )) ~ '(VENDIT|SELLER|PROPRIET|VENDE CASA|IN_VENDITA)'
        )
        and not exists ($new$;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='f1_daily_seller_calls_v1'
    and pg_get_function_identity_arguments(p.oid)='p_target_count integer';

  if v_def is null then
    raise exception 'Funzione f1_daily_seller_calls_v1 non trovata';
  end if;

  -- Idempotenza: se il filtro nuovo esiste già non fare nulla.
  if position('FSBO' in v_def)>0
     and position('PAST_CLIENT' in v_def)>0
     and position('POSSIBILE SELLER' in v_def)>0
     and position('COMPETITOR_LISTING' in v_def)>0
     and position(v_old in v_def)=0 then
    return;
  end if;

  if position(v_old in v_def)=0 then
    raise exception 'Punto di modifica non trovato nella funzione';
  end if;

  v_def := replace(v_def,v_old,v_new);
  execute v_def;
end
$do$;
