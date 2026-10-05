-- F1 CRM companies hub
create or replace function public.f1_crm_companies_page_v1(
  p_offset integer default 0,
  p_limit integer default 50,
  p_search text default '',
  p_filters jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=public,pg_temp
as $$
declare
  v_offset integer:=greatest(coalesce(p_offset,0),0);
  v_limit integer:=greatest(1,least(coalesce(p_limit,50),100));
  v_search text:=trim(coalesce(p_search,''));
  v_rows jsonb:='[]'::jsonb;
  v_filtered bigint:=0;
  v_total bigint:=0;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;
  with base as (
    select a.*,
      concat_ws(' ',a.ragione_sociale,a.partita_iva,a.codice_fiscale,a.settore,a.indirizzo,a.comune,a.cap,a.provincia,
        a.telefono,a.email,a.pec,a.sito_web,a.referente_nome,a.referente_cognome,a.referente_telefono,a.referente_email,
        a.referente_ruolo,a.canale_acquisizione,a.stato,a.interesse,a.note,a.prossima_azione) as searchable
    from public.aziende a
  ),
  filtered as (
    select * from base b
    where (v_search='' or b.searchable ilike '%'||v_search||'%')
      and (coalesce(trim(p_filters->>'comune'),'')='' or b.comune ilike '%'||trim(p_filters->>'comune')||'%')
      and (coalesce(trim(p_filters->>'settore'),'')='' or b.settore ilike '%'||trim(p_filters->>'settore')||'%')
      and (coalesce(trim(p_filters->>'stato'),'')='' or upper(coalesce(b.stato,''))=upper(trim(p_filters->>'stato')))
  ),
  page as (
    select * from filtered
    order by data_prossima_azione asc nulls last, lead_score desc nulls last, updated_at desc
    limit v_limit offset v_offset
  )
  select
    coalesce((select jsonb_agg(to_jsonb(p)-'searchable' order by p.data_prossima_azione asc nulls last,p.lead_score desc nulls last,p.updated_at desc) from page p),'[]'::jsonb),
    (select count(*) from filtered),
    (select count(*) from base)
  into v_rows,v_filtered,v_total;
  return jsonb_build_object('section','AZIENDE','rows',v_rows,'filtered',v_filtered,'total',v_total,'offset',v_offset,'limit',v_limit);
end;
$$;
revoke all on function public.f1_crm_companies_page_v1(integer,integer,text,jsonb) from public,anon;
grant execute on function public.f1_crm_companies_page_v1(integer,integer,text,jsonb) to authenticated;
