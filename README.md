# F1 Immobiliare — Acquisition Engine 5 Pillars

## Ingresso unico

L'interfaccia operativa canonica è `oggi.html`.

`oggi.html` è **F1 Acquisition Command Center**: deve dire quali opportunità lavorare, perché sono prioritarie, da quale pilastro arrivano e qual è la prossima azione.

`index.html` resta **Archivio / Strumenti / Amministrazione** e non è una seconda cabina operativa.

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

Le dashboard Facebook/Instagram esistenti restano dedicate a promozione immobili, community, buyer lead, Open House, Just Listed/Just Sold e contenuti. Un eventuale seller lead può entrare nell'Acquisition Engine, ma i social marketing tool non sono la cabina di acquisizione.

## Source of truth

- **Territorio:** `config/territory.json`.
- **Regole Acquisition:** `config/acquisition-engine.json`.
- **Database operativo target:** Supabase con RLS.
- **Feed GitHub Pages:** `data/acquisition-public.json`, solo dati non sensibili.
- **localStorage:** cache/offline queue, non database centrale.

Nessuna vista nuova deve mantenere liste territoriali indipendenti hard-coded.

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

## Pipeline pubblica giornaliera

`scripts/acquisition_daily.py` genera `data/acquisition-public.json` attraverso `.github/workflows/f1-acquisition-daily.yml`.

Il feed pubblico contiene eventi/task e informazioni territoriali non sensibili. Non deve contenere telefono, email, nominativi privati o contatti di residenti.

## Property / Competitor history

Il modello Supabase definito in `supabase-schema.sql` aggiunge, tra le altre, le entità:

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

Le osservazioni storiche devono essere append-only: un ribasso non cancella il prezzo precedente e un cambio agenzia non cancella l'agenzia precedente.

## Regole di evidenza e compliance

- nessun bypass CAPTCHA/login/area privata;
- nessuna inferenza automatica di proprietà da via/civico/contatto vicino;
- un annuncio scomparso diventa `NON_PIU_RILEVATO`, non automaticamente `VENDUTO`;
- `INCARICO_SCADUTO` richiede evidenza esplicita, altrimenti usare classificazioni di verifica;
- i task telefonici richiedono comunque le verifiche applicabili prima del contatto;
- conservare fonte/URL/evidenza per le classificazioni.

## QA

La suite corrente è orientata alla nuova architettura:

- `tests/test_acquisition_daily.py` — territorio, scoring, privacy, deduplicazione/stabilità;
- `tests/acquisition-command-center.spec.js` — desktop/mobile, 5 Pillars, territorio, link core e privacy feed;
- `.github/workflows/f1-acquisition-qa.yml` — Python, JavaScript syntax e Playwright sui pull request.

La precedente entry QA `acquisitore-pro` non è più il riferimento canonico.

## Migrazione

La trasformazione è incrementale. Non rimuovere workflow one-shot, versioni legacy o `f1-os-mobile.html` finché la nuova QA non è verde e le funzioni residue non sono state migrate.

Il piano completo è in `docs/F1_ACQUISITION_5_PILLARS_ARCHITECTURE.md`.
