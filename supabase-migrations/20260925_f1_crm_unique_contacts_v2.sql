-- CRM F1 · Anagrafica contatti unica v2
-- 2026-09-25
-- Obiettivi:
-- 1) sincronizzare automaticamente network_contacts -> leads senza duplicare telefono/email;
-- 2) deduplicare la vista CONTATTI su telefono/email normalizzati;
-- 3) lasciare separati gli omonimi senza identificatori forti;
-- 4) usare le RLS esistenti come perimetro di visibilità, evitando il vecchio vincolo user_id=auth.uid() nel CRM hub.

create schema if not exists f1_private;

create or replace function f1_private.sync_network_contact_to_crm_v1(p_contact_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','f1_private','pg_temp'
as $function$
declare
  n public.network_contacts%rowtype;
  v_lead_id text;
  v_generated_id text := 'NET:' || p_contact_id::text;
  v_phone text;
  v_email text;
  v_status text;
  v_source_type text;
  v_notes text;
  v_next_date timestamptz;
begin
  select * into n
  from public.network_contacts
  where contact_id=p_contact_id;

  if not found or coalesce(n.deleted,false) then
    update public.leads
       set deleted=true, updated_at=now()
     where lead_id=v_generated_id
       and created_by='f1_network_contact_sync';
    return v_generated_id;
  end if;

  v_phone := nullif(regexp_replace(coalesce(n.telefono,''),'\D','','g'),'');
  if v_phone is not null and v_phone like '39%' and length(v_phone)>10 then
    v_phone := substr(v_phone,3);
  end if;
  v_email := nullif(lower(trim(coalesce(n.email,''))),'');
  v_source_type := case when coalesce(n.centro_influenza,false) then 'COI' else 'NETWORK_CONTACT' end;
  v_status := case upper(trim(coalesce(n.stato_contatto,'')))
    when 'DA_CONTATTARE' then 'DA_CONTATTARE'
    when 'CONTATTATO' then 'CONTATTATO'
    when 'RICHIAMO' then 'RICHIAMO'
    when 'DA_RICONTATTARE' then 'DA_RICONTATTARE'
    when 'APPUNTAMENTO' then 'APPUNTAMENTO'
    when 'VALUTAZIONE' then 'VALUTAZIONE'
    when 'INCARICO' then 'INCARICO'
    when 'NON_INTERESSATO' then 'NON_INTERESSATO'
    when 'NON_CONTATTARE' then 'NON_CONTATTARE'
    when 'ACQUISITO' then 'ACQUISITO'
    when 'PERSO' then 'PERSO'
    else 'DA_CONTATTARE'
  end;
  v_notes := concat_ws(' · ',
    nullif(trim(coalesce(n.note,'')),''),
    case when nullif(trim(coalesce(n.come_lo_conosco,'')),'') is not null then 'Relazione: '||trim(n.come_lo_conosco) end,
    case when nullif(trim(coalesce(n.professione,'')),'') is not null then 'Professione: '||trim(n.professione) end
  );
  if n.data_prossimo_contatto is not null then
    v_next_date := (n.data_prossimo_contatto + time '09:00') at time zone 'Europe/Rome';
  end if;

  select l.lead_id into v_lead_id
  from public.leads l
  where l.user_id=n.user_id
    and coalesce(l.deleted,false)=false
    and (
      (v_phone is not null and
        case
          when regexp_replace(coalesce(l.telefono,''),'\D','','g') like '39%'
               and length(regexp_replace(coalesce(l.telefono,''),'\D','','g'))>10
          then substr(regexp_replace(coalesce(l.telefono,''),'\D','','g'),3)
          else regexp_replace(coalesce(l.telefono,''),'\D','','g')
        end = v_phone)
      or
      (v_email is not null and lower(trim(coalesce(l.email,'')))=v_email)
    )
  order by
    (l.lead_id=v_generated_id) desc,
    l.updated_at desc,
    l.lead_score desc
  limit 1;

  if v_lead_id is not null and v_lead_id<>v_generated_id then
    update public.leads
       set nome=case when trim(coalesce(nome,''))='' then coalesce(n.nome,'') else nome end,
           cognome=case when trim(coalesce(cognome,''))='' then coalesce(n.cognome,'') else cognome end,
           telefono=case when trim(coalesce(telefono,''))='' then coalesce(n.telefono,'') else telefono end,
           email=case when trim(coalesce(email,''))='' then coalesce(n.email,'') else email end,
           comune=case when trim(coalesce(comune,''))='' then coalesce(n.comune,'') else comune end,
           azienda=case when trim(coalesce(azienda,''))='' then coalesce(n.azienda,'') else azienda end,
           next_action=case when trim(coalesce(next_action,''))='' then coalesce(n.azione_successiva,'') else next_action end,
           next_action_date=coalesce(next_action_date,v_next_date),
           notes=case when trim(coalesce(notes,''))='' then coalesce(v_notes,'') else notes end,
           updated_at=greatest(updated_at,coalesce(n.updated_at,now())),
           market_data=coalesce(market_data,'{}'::jsonb) || jsonb_build_object(
             'network_contact_id',n.contact_id,
             'network_contact_synced_at',now(),
             'network_contact_scope',coalesce(n.app_scope,''),
             'network_tree_source',coalesce(n.tree_source,'')
           )
     where lead_id=v_lead_id;

    update public.leads
       set deleted=true, updated_at=now()
     where lead_id=v_generated_id
       and created_by='f1_network_contact_sync';

    return v_lead_id;
  end if;

  v_lead_id := v_generated_id;

  insert into public.leads(
    lead_id,user_id,pillar,source_type,source,source_url,created_at,first_seen,last_seen,
    nome,cognome,azienda,telefono,email,comune,via,civico,zona,immobile_id,competitor_agency,
    lead_reason,lead_score,confidence,status,last_contact,next_action,next_action_date,assigned_to,
    notes,privacy_basis,do_not_contact,rpo_status,created_by,updated_at,deleted,
    created_by_user_id,last_modified_by_user_id,assigned_user_id,market_data
  ) values (
    v_lead_id,n.user_id,2,v_source_type,'ALBERO FONTI DI NOTIZIE','',
    coalesce(n.created_at,now()),coalesce(n.created_at,now()),coalesce(n.updated_at,now()),
    coalesce(n.nome,''),coalesce(n.cognome,''),coalesce(n.azienda,''),coalesce(n.telefono,''),coalesce(n.email,''),
    coalesce(n.comune,''),'','','','','',
    case when coalesce(n.centro_influenza,false) then 'CENTRO DI INFLUENZA · ALBERO RELAZIONALE' else 'CONTATTO · ALBERO RELAZIONALE' end,
    case when coalesce(n.centro_influenza,false) then 65 else 50 end,
    case when v_phone is not null or v_email is not null then 'HIGH' else 'MEDIUM' end,
    v_status,n.ultima_interazione,coalesce(n.azione_successiva,''),v_next_date,'',
    coalesce(v_notes,''),'DA_VERIFICARE',false,
    case when v_phone is null then 'NON_APPLICABILE' else 'DA_VERIFICARE' end,
    'f1_network_contact_sync',coalesce(n.updated_at,now()),false,
    n.user_id,n.user_id,null,
    jsonb_build_object(
      'network_contact_id',n.contact_id,
      'network_contact_synced_at',now(),
      'network_contact_scope',coalesce(n.app_scope,''),
      'network_tree_source',coalesce(n.tree_source,''),
      'network_tipo_rapporto',to_jsonb(coalesce(n.tipo_rapporto,'{}'::text[]))
    )
  )
  on conflict (lead_id) do update set
    user_id=excluded.user_id,
    pillar=excluded.pillar,
    source_type=excluded.source_type,
    source=excluded.source,
    first_seen=coalesce(public.leads.first_seen,excluded.first_seen),
    last_seen=excluded.last_seen,
    nome=excluded.nome,
    cognome=excluded.cognome,
    azienda=excluded.azienda,
    telefono=excluded.telefono,
    email=excluded.email,
    comune=excluded.comune,
    lead_reason=excluded.lead_reason,
    lead_score=excluded.lead_score,
    confidence=excluded.confidence,
    status=excluded.status,
    last_contact=excluded.last_contact,
    next_action=excluded.next_action,
    next_action_date=excluded.next_action_date,
    notes=excluded.notes,
    privacy_basis=excluded.privacy_basis,
    rpo_status=excluded.rpo_status,
    updated_at=excluded.updated_at,
    deleted=false,
    last_modified_by_user_id=excluded.last_modified_by_user_id,
    market_data=coalesce(public.leads.market_data,'{}'::jsonb) || excluded.market_data;

  return v_lead_id;
end;
$function$;

revoke all on function f1_private.sync_network_contact_to_crm_v1(uuid) from public,anon,authenticated;

create or replace function f1_private.network_contact_to_crm_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','f1_private','pg_temp'
as $function$
begin
  if tg_op='DELETE' then
    update public.leads
       set deleted=true,updated_at=now()
     where lead_id='NET:'||old.contact_id::text
       and created_by='f1_network_contact_sync';
    return old;
  end if;

  perform f1_private.sync_network_contact_to_crm_v1(new.contact_id);
  return new;
end;
$function$;

revoke all on function f1_private.network_contact_to_crm_trigger_v1() from public,anon,authenticated;

drop trigger if exists trg_network_contact_to_crm_v1 on public.network_contacts;
create trigger trg_network_contact_to_crm_v1
after insert or update or delete on public.network_contacts
for each row execute function f1_private.network_contact_to_crm_trigger_v1();

do $$
declare x record;
begin
  for x in
    select contact_id
    from public.network_contacts
    where coalesce(deleted,false)=false
  loop
    perform f1_private.sync_network_contact_to_crm_v1(x.contact_id);
  end loop;
end $$;

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
    with base0 as (
      select
        l.*,
        coalesce(
          nullif(trim(l.market_data->>'property_type_normalized'),''),
          nullif(trim(l.market_data#>>'{raccoglitore_payload,tipologia}'),''),
          ''
        ) as tipologia_filtro,
        case
          when nullif(regexp_replace(coalesce(l.telefono,''),'\D','','g'),'') is not null then
            'P:' ||
            case
              when regexp_replace(coalesce(l.telefono,''),'\D','','g') like '39%'
                   and length(regexp_replace(coalesce(l.telefono,''),'\D','','g'))>10
              then substr(regexp_replace(coalesce(l.telefono,''),'\D','','g'),3)
              else regexp_replace(coalesce(l.telefono,''),'\D','','g')
            end
          when nullif(lower(trim(coalesce(l.email,''))),'') is not null then
            'E:' || lower(trim(l.email))
          else 'L:' || l.lead_id
        end as identity_key,
        concat_ws(' ',
          l.source_type,l.source,l.lead_reason,l.notes,l.status,l.nome,l.cognome,
          l.telefono,l.email,l.comune,l.via,l.civico,l.zona,l.market_data::text
        ) as searchable
      from public.leads l
      where coalesce(l.deleted,false)=false
        and (
          nullif(trim(coalesce(l.nome,'')),'') is not null
          or nullif(trim(coalesce(l.cognome,'')),'') is not null
          or nullif(trim(coalesce(l.telefono,'')),'') is not null
          or nullif(trim(coalesce(l.email,'')),'') is not null
        )
    ),
    base_ranked as (
      select b.*,
             row_number() over (
               partition by b.identity_key
               order by
                 ((case when nullif(trim(coalesce(b.nome,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.cognome,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.telefono,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.email,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.comune,'')),'') is not null then 1 else 0 end)) desc,
                 b.updated_at desc,
                 b.lead_score desc
             ) as identity_rank
      from base0 b
    ),
    filtered_candidates as (
      select b.*
      from base0 b
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
    filtered_ranked as (
      select b.*,
             row_number() over (
               partition by b.identity_key
               order by
                 ((case when nullif(trim(coalesce(b.nome,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.cognome,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.telefono,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.email,'')),'') is not null then 1 else 0 end) +
                  (case when nullif(trim(coalesce(b.comune,'')),'') is not null then 1 else 0 end)) desc,
                 b.updated_at desc,
                 b.lead_score desc
             ) as identity_rank
      from filtered_candidates b
    ),
    filtered as (
      select * from filtered_ranked where identity_rank=1
    ),
    page as (
      select * from filtered
      order by updated_at desc, lead_score desc
      limit v_limit offset v_offset
    )
    select
      coalesce((select jsonb_agg(to_jsonb(p) - 'searchable' - 'identity_key' - 'identity_rank' order by p.updated_at desc,p.lead_score desc) from page p),'[]'::jsonb),
      (select count(*) from filtered),
      (select count(*) from base_ranked where identity_rank=1)
    into v_rows,v_filtered,v_total;

  elsif v_section='IMMOBILI' then
    with base as (
      select p.*,
             concat_ws(' ',p.comune,p.via,p.civico,p.zona,p.frazione,p.tipologia,p.status,p.caratteristiche::text) as searchable
      from public.properties p
      where coalesce(p.deleted,false)=false
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
      where coalesce(l.deleted,false)=false
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
       and coalesce(l.deleted,false)=false
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
