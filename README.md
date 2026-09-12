# F1 Immobiliare — Acquisition Engine 5 Pillars

## Ingresso unico

L'interfaccia operativa canonica è `oggi.html`.

`oggi.html` è **F1 Acquisition Command Center**: indica quali opportunità lavorare, perché sono prioritarie, da quale pilastro arrivano e qual è la prossima azione.

`index.html` è **Archivio / Strumenti / Amministrazione** e non è una seconda cabina operativa.

## Le due macro-aree

### A — Acquisition Engine

L'acquisizione lavora sui 5 pilastri configurati in `config/acquisition-engine.json`:

1. Seller Prospecting;
2. Database & Referral;
3. Farming territoriale;
4. Partnership & Channels;
5. Core Business Priority.

Il Core 4 prioritario è: clienti passati, centri di influenza, scaduti/possibili scaduti verificabili e FSBO.

### B — Property Marketing Engine

Le dashboard Facebook/Instagram restano dedicate a promozione immobili, community, buyer lead, Open House, Just Listed/Just Sold e contenuti. Un eventuale seller lead può entrare nell'Acquisition Engine, ma i social marketing tool non sono la cabina di acquisizione.

## Source of truth

- **Territorio:** `config/territory.json`.
- **Regole Acquisition:** `config/acquisition-engine.json`.
- **Database operativo:** Supabase con RLS.
- **Feed GitHub Pages:** `data/acquisition-public.json`, solo dati non sensibili.
- **localStorage:** cache/offline queue, non database centrale.

Nessuna vista operativa deve mantenere liste territoriali indipendenti hard-coded.

## Flusso principale

```text
SOURCE
  -> NORMALIZZAZIONE
  -> PROPERTY / LEAD MODEL
  -> EVENTO
  -> TASK
  -> OGGI / TELEFONATE / GIRO
  -> INTERAZIONE / ESITO
  -> CRM
  -> KPI
```

`telefonate-oggi.html` è la vista specializzata dei task `CALL`.

`giro-acquisizione.html` è la vista specializzata dei task `FIELD`.

`seller-radar-unico.html` usa il feed Acquisition e il territorio canonico.

`competitor-intelligence.html` usa lo storico immobiliare autenticato quando disponibile e degrada sul feed pubblico non sensibile.

## Pipeline pubblica giornaliera

`scripts/acquisition_daily.py` genera `data/acquisition-public.json` attraverso `.github/workflows/f1-acquisition-daily.yml`.

Il feed pubblico contiene eventi/task e informazioni territoriali non sensibili. Non deve contenere telefono, email, nominativi privati o contatti di residenti.

## Property / Competitor history

Il modello Supabase definito in `supabase-schema.sql` comprende, tra le altre, le entità:

- `leads`;
- `properties`;
- `property_observations`;
- `agencies`;
- `property_agency_history`;
- `events`;
- `tasks`;
- `interactions`;
- `referrals`;
- `campaigns`;
- `territories`;
- `social_signals`.

Le osservazioni storiche sono append-only: un ribasso non cancella il prezzo precedente e un cambio agenzia non cancella l'agenzia precedente.

Le migration applicate al progetto live sono persistite in `supabase-migrations/`.

## Core 4 e task

Past Client, COI, FSBO e possibili scaduti entrano nella coda quotidiana solo quando esiste una `next_action_date` esplicita già dovuta.

Il sistema non inventa cadenze di ricontatto. Se il contatto non è eleggibile o richiede una verifica, genera `VERIFY` invece di `CALL`.

## Regole di evidenza e compliance

- nessun bypass CAPTCHA/login/area privata;
- nessuna inferenza automatica di proprietà da via/civico/contatto vicino;
- `INDIZIO_PRIVATO` non equivale automaticamente a FSBO verificato;
- un annuncio scomparso diventa `NON_PIU_RILEVATO`, non automaticamente `VENDUTO`;
- `INCARICO_SCADUTO` richiede evidenza esplicita;
- i task telefonici richiedono le verifiche applicabili prima del contatto;
- DNC/RPO possono bloccare telefono, WhatsApp e accesso alla centrale;
- conservare fonte/URL/evidenza per ogni classificazione rilevante.

## QA

La suite canonica copre:

- `tests/test_acquisition_daily.py` — territorio, scoring, privacy, stabilità task e Core 4;
- `tests/acquisition-command-center.spec.js` — desktop/mobile, 5 Pillars, Cloud login-only, gate RPO, route core e privacy feed;
- `.github/workflows/f1-acquisition-qa.yml` — Python, JavaScript syntax, link integrity, guard workflow legacy e Playwright.

La precedente entry QA `acquisitore-pro` è stata rimossa e non è più un riferimento del repository.

## Consolidamento legacy

I workflow one-shot `fix-*`, `patch-*`, `repair-*` e la vecchia riscrittura territoriale sono stati rimossi dalla cartella GitHub Actions. La cronologia Git ne conserva il contenuto; il registro è in `docs/LEGACY_WORKFLOWS_ARCHIVED.md`.

La precedente cabina mobile autonoma non fa parte della navigazione canonica. Il file resta temporaneamente disponibile solo come legacy tecnico finché le eventuali funzioni residue non vengono riclassificate o migrate, ma non deve essere usato come ingresso operativo.

Il piano architetturale è in `docs/F1_ACQUISITION_5_PILLARS_ARCHITECTURE.md`.