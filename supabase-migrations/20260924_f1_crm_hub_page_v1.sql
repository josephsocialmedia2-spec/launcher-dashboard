-- CRM F1 centrale: contatti, immobili, trattative, attività.
-- La funzione usa SECURITY INVOKER e limita i dati all'utente autenticato.

create or replace function public.f1_crm_hub_page_v1(
  p_section text default 'CONTATTI',
  p_offset integer default 0,
  p_limit integer default 50,
  p_search text default '',
  p_filters jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  v_section text := upper(trim(coalesce(p_section,'CONTATTI')));
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_limit integer := greatest(1,least(coalesce(p_limit,50),100));
  v_search text := trim(coalesce(p_search,''));
  v_rows jsonb := '[]'::jsonb;
  v_filtered bigint := 0;
  v_total bigint := 0;
begin
  if auth.uid() is null then
    raise exception 'ACCESSO RICHIESTO';
  end if;

  if v_section='CONTATTI' then
    with base as (
      select
        l.*,
        coalesce(
          nullif(trim(l.market_data->>'property_type_normalized'),''),
          nullif(trim(l.market_data#>>'{raccoglitore_payload,tipologia}'),''),
          ''
        ) as tipologia_filtro,
        concat_ws(' ',
          l.source_type,l.source,l.lead_reason,l.notes,l.status,l.nome,l.cognome,
          l.telefono,l.email,l.comune,l.via,l.civico,l.zona,l.market_data::text
        ) as searchable
      from public.leads l
      where l.user_id=auth.uid()
        and coalesce(l.deleted,false)=false
        and (
          nullif(trim(coalesce(l.nome,'')),'') is not null
          or nullif(trim(coalesce(l.cognome,'')),'') is not null
          or nullif(trim(coalesce(l.telefono,'')),'') is not null
          or nullif(trim(coalesce(l.email,'')),'') is not null
        )
    ),
    filtered as (
      select *
      from base b
      where
        (v_search='' or b.searchable ilike '%'||v_search||'%')
        and (coalesce(trim(p_filters->>'telefono'),'')='' or regexp_replace(coalesce(b.telefono,''),'\D','','g') like '%'||regexp_replace(p_filters->>'telefono','\D','','g')||'%')
        and (coalesce(trim(p_filters->>'nome'),'')='' or b.nome ilike '%'||trim(p_filters->>'nome')||'%')
        and (coalesce(trim(p_filters->>'cognome'),'')='' or b.cognome ilike '%'||trim(p_filters->>'cognome')||'%')
        and (coalesce(trim(p_filters->>'comune'),'')='' or b.comune ilike '%'||trim(p_filters->>'comune')||'%')
        and (coalesce(trim(p_filters->>'tipologia'),'')='' or b.tipologia_filtro ilike '%'||trim(p_filters->>'tipologia')||'%')
        and (
          not (
            coalesce((p_filters->>'ricerca')::boolean,false)
            or coalesce((p_filters->>'vendita')::boolean,false)
            or coalesce((p_filters->>'privato')::boolean,false)
          )
          or (
            coalesce((p_filters->>'ricerca')::boolean,false)
            and upper(b.searchable) ~ '(RICERCA|CERCO|ACQUIRENT|BUYER)'
          )
          or (
            coalesce((p_filters->>'vendita')::boolean,false)
            and upper(b.searchable) ~ '(VENDIT|SELLER|PROPRIET|IN_VENDITA|IMMOBILE F1)'
          )
          or (
            coalesce((p_filters->>'privato')::boolean,false)
            and (
              upper(coalesce(b.source_type,'')) in ('FSBO','FSBO_CANDIDATE')
              or upper(b.searchable) ~ '(PRIVAT|FSBO)'
              or upper(coalesce(b.market_data#>>'{raccoglitore_payload,categoria}',''))='POSSIBILE SELLER'
            )
          )
        )
    ),
    page as (
      select * from filtered
      order by updated_at desc, lead_score desc
      limit v_limit offset v_offset
    )
    select
      coalesce((select jsonb_agg(to_jsonb(p) - 'searchable' order by p.updated_at desc,p.lead_score desc) from page p),'[]'::jsonb),
      (select count(*) from filtered),
      (select count(*) from base)
    into v_rows,v_filtered,v_total;

  elsif v_section='IMMOBILI' then
    with base as (
      select p.*,
             concat_ws(' ',p.comune,p.via,p.civico,p.zona,p.frazione,p.tipologia,p.status,p.caratteristiche::text) as searchable
      from public.properties p
      where p.user_id=auth.uid() and coalesce(p.deleted,false)=false
    ),
    filtered as (
      select * from base b
      where (v_search='' or b.searchable ilike '%'||v_search||'%')
        and (coalesce(trim(p_filters->>'comune'),'')='' or b.comune ilike '%'||trim(p_filters->>'comune')||'%')
        and (coalesce(trim(p_filters->>'tipologia'),'')='' or b.tipologia ilike '%'||trim(p_filters->>'tipologia')||'%')
    ),
    page as (
      select * from filtered
      order by updated_at desc
      limit v_limit offset v_offset
    )
    select
      coalesce((select jsonb_agg(to_jsonb(p) - 'searchable' order by p.updated_at desc) from page p),'[]'::jsonb),
      (select count(*) from filtered),
      (select count(*) from base)
    into v_rows,v_filtered,v_total;

  elsif v_section='TRATTATIVE' then
    with base as (
      select
        l.*,
        concat_ws(' ',l.nome,l.cognome,l.telefono,l.email,l.comune,l.via,l.civico,l.zona,l.status,l.next_action,l.notes,l.source_type,l.lead_reason) as searchable
      from public.leads l
      where l.user_id=auth.uid()
        and coalesce(l.deleted,false)=false
        and upper(coalesce(l.status,'')) in (
          'CONTATTATO','POTENZIALE','RICHIAMO','DA_RICONTATTARE',
          'APPUNTAMENTO','VALUTAZIONE','INCARICO','ACQUISITO',
          'IN_CORSO','IN_VENDITA'
        )
    ),
    filtered as (
      select * from base b
      where (v_search='' or b.searchable ilike '%'||v_search||'%')
    ),
    page as (
      select * from filtered
      order by
        case upper(coalesce(status,''))
          when 'INCARICO' then 1
          when 'VALUTAZIONE' then 2
          when 'APPUNTAMENTO' then 3
          when 'POTENZIALE' then 4
          when 'CONTATTATO' then 5
          else 6
        end,
        updated_at desc
      limit v_limit offset v_offset
    )
    select
      coalesce((select jsonb_agg(to_jsonb(p) - 'searchable') from page p),'[]'::jsonb),
      (select count(*) from filtered),
      (select count(*) from base)
    into v_rows,v_filtered,v_total;

  elsif v_section='ATTIVITA' then
    with base as (
      select
        t.*,
        l.nome as lead_nome,
        l.cognome as lead_cognome,
        l.telefono as lead_telefono,
        l.comune as lead_comune,
        concat_ws(' ',t.task_type,t.reason,t.status,t.outcome,t.assigned_to,t.metadata::text,l.nome,l.cognome,l.telefono,l.comune) as searchable
      from public.tasks t
      left join public.leads l
        on l.lead_id=t.lead_id
       and l.user_id=t.user_id
       and coalesce(l.deleted,false)=false
      where t.user_id=auth.uid()
    ),
    filtered as (
      select * from base b
      where (v_search='' or b.searchable ilike '%'||v_search||'%')
        and (
          coalesce(trim(p_filters->>'stato'),'')=''
          or upper(coalesce(b.status,''))=upper(trim(p_filters->>'stato'))
        )
    ),
    page as (
      select * from filtered
      order by
        (upper(coalesce(status,'OPEN')) not in ('DONE','CANCELLED')) desc,
        due_date asc nulls last,
        priority desc,
        updated_at desc
      limit v_limit offset v_offset
    )
    select
      coalesce((select jsonb_agg(to_jsonb(p) - 'searchable') from page p),'[]'::jsonb),
      (select count(*) from filtered),
      (select count(*) from base)
    into v_rows,v_filtered,v_total;

  else
    raise exception 'SEZIONE CRM NON VALIDA';
  end if;

  return jsonb_build_object(
    'section',v_section,
    'rows',v_rows,
    'filtered',v_filtered,
    'total',v_total,
    'offset',v_offset,
    'limit',v_limit
  );
end;
$function$;

revoke all on function public.f1_crm_hub_page_v1(text,integer,integer,text,jsonb) from public;
revoke all on function public.f1_crm_hub_page_v1(text,integer,integer,text,jsonb) from anon;
grant execute on function public.f1_crm_hub_page_v1(text,integer,integer,text,jsonb) to authenticated;
