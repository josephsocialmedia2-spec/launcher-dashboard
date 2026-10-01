-- F1: rimuove l'obiettivo numerico dai task telefonici ancora aperti.
-- I task DONE/CANCELLED restano invariati per conservare lo storico.

update public.tasks
set metadata=jsonb_set(
      coalesce(metadata,'{}'::jsonb),
      '{goal}',
      to_jsonb('CODA TELEFONATE OPERATIVA · NESSUN OBIETTIVO NUMERICO'::text),
      true
    ),
    updated_at=now()
where metadata->>'goal'='100 TELEFONATE ALLA RICERCA DI IMMOBILI IN VENDITA'
  and upper(coalesce(status,'OPEN')) not in ('DONE','CANCELLED');
