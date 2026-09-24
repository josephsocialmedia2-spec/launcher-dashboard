-- F1 Albero delle Fonti di Notizie · Motore relazionale/mnemonico v2
-- Estende la tabella impostazioni esistente; nessun dato viene rimosso.

alter table public.f1_tree_settings
  add column if not exists data_version integer not null default 1,
  add column if not exists graph_meta jsonb not null default '{}'::jsonb;

comment on column public.f1_tree_settings.data_version is
  'Versione struttura dati Albero delle Fonti di Notizie';

comment on column public.f1_tree_settings.graph_meta is
  'Metadati relazionali globali: relazioni, luoghi, ricordi, stato motore mnemonico e registro tecnico';

-- RLS della tabella f1_tree_settings è già attiva e resta invariata.
