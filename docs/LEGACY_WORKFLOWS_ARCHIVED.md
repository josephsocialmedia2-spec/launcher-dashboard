# Workflow legacy rimossi dalla cartella Actions

Questi workflow erano patch/migrazioni one-shot già applicate oppure procedure appartenenti a una precedente architettura territoriale. Sono stati rimossi da `.github/workflows/` durante il consolidamento F1 Acquisition Engine, così non possono essere rilanciati accidentalmente contro il sistema corrente.

La cronologia Git conserva integralmente ogni file e permette il recupero puntuale se mai servisse una verifica storica.

## Rimossi

- `apply-territorial-continuity-rule.yml` — vecchia regola di continuità territoriale incompatibile con `config/territory.json` come source of truth.
- `fix-territorial-apostrophes.yml` — fix one-shot completato.
- `fix-territorial-apostrophes-v2.yml` — seconda iterazione one-shot completata.
- `integrate-neighborhood-telefonate.yml` — integrazione storica già incorporata nelle viste correnti.
- `patch-instagram-card.yml` — patch UI già applicata.
- `patch-instagram-ranking-gate.yml` — patch ranking già applicata.
- `patch-seller-radar-edilizio-ui.yml` — patch Seller/Radar Edilizio già applicata.
- `patch-telefonate-references.yml` — patch riferimenti Telefonate già incorporata.
- `repair-neighborhood-operational.yml` — workflow di riparazione one-shot già superato dal pipeline corrente.

## Workflow operativi che restano attivi

Restano in `.github/workflows/` i workflow con funzione continuativa o QA, tra cui Acquisition Daily/QA, Neighborhood Intelligence, Radar Edilizio, reminder gruppi, guida mattutina, CAPTCHA alert e le QA Directory/Microzone ancora necessarie ai componenti locali.

## Regola

Non reintrodurre workflow `fix-*`, `patch-*`, `repair-*` o vecchie riscritture territoriali senza una nuova esigenza documentata e una QA dedicata. La configurazione territoriale canonica è `config/territory.json`.