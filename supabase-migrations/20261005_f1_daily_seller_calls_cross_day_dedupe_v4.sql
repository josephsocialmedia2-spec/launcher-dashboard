-- F1 Daily Seller Calls v4
-- Impedisce la creazione di più task OPEN per lo stesso lead tra giornate diverse
-- e mantiene in coda i carry-over già scaduti. I duplicati esistenti vengono
-- cancellati logicamente (CANCELLED), mai eliminati.

with ranked as (
  select
    task_id,
    row_number() over (
      partition by user_id, lead_id
      order by due_date desc nulls last, created_at desc, task_id desc
    ) as rn
  from public.tasks
  where metadata->>'origin'='DAILY_SELLER_50'
    and upper(coalesce(status,'OPEN')) in ('OPEN','IN_PROGRESS','BLOCKED')
    and nullif(lead_id,'') is not null
)
update public.tasks t
set status='CANCELLED',
    outcome='AUTO_DEDUPLICATED',
    completed_at=now(),
    metadata=jsonb_set(
      jsonb_set(coalesce(t.metadata,'{}'::jsonb),'{dedupe_status}',to_jsonb('AUTO_CANCELLED_DUPLICATE'::text),true),
      '{deduped_at}',to_jsonb(now()::text),true
    ),
    updated_at=now()
from ranked r
where t.task_id=r.task_id
  and r.rn>1;

do $do$
declare
  v_def text;
  v_old_scope text := $old$
  where t.user_id=v_user
    and t.metadata->>'origin'='DAILY_SELLER_50'
    and t.metadata->>'batch_date'=v_today::text;$old$;
  v_new_scope text := $new$
  where t.user_id=v_user
    and t.metadata->>'origin'='DAILY_SELLER_50'
    and (
      t.metadata->>'batch_date'=v_today::text
      or (
        upper(coalesce(t.status,'OPEN')) not in ('DONE','CANCELLED')
        and coalesce((t.due_date at time zone 'Europe/Rome')::date,v_today)<=v_today
      )
    );$new$;
  v_old_candidate text := $old$
        and not exists (
          select 1
          from public.tasks td
          where td.user_id=v_user
            and td.lead_id=l.lead_id
            and td.metadata->>'origin'='DAILY_SELLER_50'
            and td.metadata->>'batch_date'=v_today::text
        )$old$;
  v_new_candidate text := $new$
        and not exists (
          select 1
          from public.tasks td
          where td.user_id=v_user
            and td.lead_id=l.lead_id
            and td.metadata->>'origin'='DAILY_SELLER_50'
            and upper(coalesce(td.status,'OPEN')) not in ('DONE','CANCELLED')
        )$new$;
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

  if position(v_old_candidate in v_def)>0 then
    v_def := replace(v_def,v_old_candidate,v_new_candidate);
  elsif position('upper(coalesce(td.status,''OPEN'')) not in (''DONE'',''CANCELLED'')' in v_def)=0 then
    raise exception 'Guardia anti-duplicato non trovata';
  end if;

  if position(v_old_scope in v_def)>0 then
    v_def := replace(v_def,v_old_scope,v_new_scope);
  elsif position('coalesce((t.due_date at time zone ''Europe/Rome'')::date,v_today)<=v_today' in v_def)=0 then
    raise exception 'Scope carry-over non trovato';
  end if;

  execute v_def;
end
$do$;
