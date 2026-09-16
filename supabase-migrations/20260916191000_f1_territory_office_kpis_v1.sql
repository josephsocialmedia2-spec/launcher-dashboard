create or replace function public.f1_territory_office_call_result(
  p_observation_id uuid,
  p_outcome text,
  p_note text default '',
  p_callback_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_obs public.f1_territory_observations%rowtype;
  v_inter public.interactions%rowtype;
  v_out text:=upper(replace(trim(coalesce(p_outcome,'')),' ','_'));
  v_state text;
  v_next text;
  v_office text:='LAVORATO';
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  select * into v_obs from public.f1_territory_observations
   where observation_id=p_observation_id and observation_type='CARTELLO_IMMOBILIARE' for update;
  if not found then raise exception 'CARTELLO NON DISPONIBILE'; end if;
  if trim(coalesce(v_obs.phone_normalized,''))='' then raise exception 'NESSUN NUMERO DISPONIBILE'; end if;
  case v_out
    when 'NON_RISPONDE' then v_state:='DA_RICHIAMARE';v_next:='RICHIAMA';v_office:='DA_RICHIAMARE';
    when 'NUMERO_ERRATO' then v_state:='RECAPITO_DA_VERIFICARE';v_next:='VERIFICA / CERCA RECAPITO';v_office:='DA_VERIFICARE';
    when 'RICHIAMARE' then
      if p_callback_date is null then raise exception 'INDICA LA DATA DEL RICHIAMO'; end if;
      v_state:='DA_RICHIAMARE';v_next:='RICHIAMA IL '||to_char(p_callback_date,'DD/MM/YYYY');v_office:='DA_RICHIAMARE';
    when 'PROPRIETARIO_CONTATTATO' then v_state:='DA_QUALIFICARE';v_next:='QUALIFICA ESIGENZA';
    when 'AGENZIA' then v_state:='AGENZIA';v_next:='VALUTA CARTELLO AGENZIA';
    when 'NUMERO_NON_PERTINENTE' then v_state:='RECAPITO_DA_VERIFICARE';v_next:='CERCA RECAPITO';v_office:='DA_VERIFICARE';
    when 'INTERESSATO_AD_APPROFONDIRE' then v_state:='DA_QUALIFICARE';v_next:='QUALIFICA ESIGENZA';
    when 'APPUNTAMENTO_DA_FISSARE' then v_state:='DA_APPUNTAMENTO';v_next:='FISSA APPUNTAMENTO';
    when 'DISPONIBILE_AD_APPUNTAMENTO' then v_state:='DA_APPUNTAMENTO';v_next:='FISSA APPUNTAMENTO';
    when 'QUALIFICATO' then v_state:='QUALIFICATO';v_next:='FISSA APPUNTAMENTO';
    when 'APPUNTAMENTO_FISSATO' then v_state:='APPUNTAMENTO_FISSATO';v_next:='PREPARA APPUNTAMENTO';
    when 'NON_CONTATTARE' then v_state:='NON_CONTATTARE';v_next:='NON CONTATTARE';
    else raise exception 'ESITO TELEFONATA NON VALIDO';
  end case;
  update public.f1_territory_observations
     set workflow_state=v_state,next_action=v_next,office_status=v_office,
         last_office_action_at=now(),last_office_action_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),version=version+1
   where observation_id=p_observation_id returning * into v_obs;
  insert into public.interactions(user_id,interaction_type,direction,outcome,note,next_action,next_action_date,metadata)
  values(auth.uid(),'PHONE','OUTBOUND',v_out,trim(coalesce(p_note,'')),v_next,p_callback_date,
         jsonb_build_object('territory_observation_id',p_observation_id,'source','CARTELLO_TERRITORIALE','phone',v_obs.phone_normalized,'comune',v_obs.comune,'via',v_obs.via,'civico',v_obs.civico,'sign_type',v_obs.sign_type))
  returning * into v_inter;
  return jsonb_build_object('ok',true,'observation',to_jsonb(v_obs),'interaction',to_jsonb(v_inter));
end;
$$;

create or replace function public.f1_territory_office_kpis(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_role text;
  v_date date:=coalesce(p_date,(timezone('Europe/Rome',now()))::date);
begin
  select upper(role) into v_role from public.f1_staff_profiles where user_id=auth.uid() and status='ACTIVE';
  if v_role not in ('TITOLARE','FUNZIONARIO') then raise exception 'PROFILO F1 NON AUTORIZZATO'; end if;
  return jsonb_build_object(
    'date',v_date,
    'cartelli_rilevati',(select count(*) from public.f1_territory_observations o where o.observation_type='CARTELLO_IMMOBILIARE' and timezone('Europe/Rome',o.observed_at)::date=v_date),
    'cartelli_verificati',(select count(*) from public.f1_territory_observations o where o.observation_type='CARTELLO_IMMOBILIARE' and o.office_verified_at is not null and timezone('Europe/Rome',o.office_verified_at)::date=v_date),
    'telefonate_effettuate',(select count(*) from public.interactions i where i.interaction_type='PHONE' and i.metadata->>'source'='CARTELLO_TERRITORIALE' and timezone('Europe/Rome',i.occurred_at)::date=v_date),
    'contatti_raggiunti',(select count(distinct i.metadata->>'territory_observation_id') from public.interactions i where i.interaction_type='PHONE' and i.metadata->>'source'='CARTELLO_TERRITORIALE' and timezone('Europe/Rome',i.occurred_at)::date=v_date and i.outcome in ('PROPRIETARIO_CONTATTATO','INTERESSATO_AD_APPROFONDIRE','APPUNTAMENTO_DA_FISSARE','DISPONIBILE_AD_APPUNTAMENTO','QUALIFICATO','APPUNTAMENTO_FISSATO')),
    'richiami',(select count(distinct i.metadata->>'territory_observation_id') from public.interactions i where i.interaction_type='PHONE' and i.metadata->>'source'='CARTELLO_TERRITORIALE' and timezone('Europe/Rome',i.occurred_at)::date=v_date and i.outcome in ('NON_RISPONDE','RICHIAMARE')),
    'qualificati',(select count(distinct i.metadata->>'territory_observation_id') from public.interactions i where i.interaction_type='PHONE' and i.metadata->>'source'='CARTELLO_TERRITORIALE' and timezone('Europe/Rome',i.occurred_at)::date=v_date and i.outcome in ('QUALIFICATO','APPUNTAMENTO_DA_FISSARE','APPUNTAMENTO_FISSATO')),
    'appuntamenti',(select count(distinct i.metadata->>'territory_observation_id') from public.interactions i where i.interaction_type='PHONE' and i.metadata->>'source'='CARTELLO_TERRITORIALE' and timezone('Europe/Rome',i.occurred_at)::date=v_date and i.outcome='APPUNTAMENTO_FISSATO')
  );
end;
$$;

create index if not exists interactions_territory_observation_idx
  on public.interactions ((metadata->>'territory_observation_id'),occurred_at desc)
  where metadata->>'source'='CARTELLO_TERRITORIALE';

revoke all on function public.f1_territory_office_kpis(date) from public,anon;
grant execute on function public.f1_territory_office_kpis(date) to authenticated;
