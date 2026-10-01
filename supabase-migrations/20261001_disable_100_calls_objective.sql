-- F1: disabilita l'obiettivo numerico "100 telefonate".
-- Mantiene invariato il cap tecnico della RPC, ma i nuovi task non dichiarano
-- piu' un obiettivo quantitativo da raggiungere.

do $do$
declare
  v_def text;
  v_old constant text := '100 TELEFONATE ALLA RICERCA DI IMMOBILI IN VENDITA';
  v_new constant text := 'CODA TELEFONATE OPERATIVA · NESSUN OBIETTIVO NUMERICO';
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

  if position(v_old in v_def)=0 then
    return;
  end if;

  v_def := replace(v_def,v_old,v_new);
  execute v_def;
end
$do$;
