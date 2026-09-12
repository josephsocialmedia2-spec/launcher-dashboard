# F1 ACQUISITION ENGINE — 5 PILLARS

## Stato

Architettura target per la migrazione incrementale del repository `launcher-dashboard`.

Principi non negoziabili:

- `oggi.html` è l'unica cabina operativa giornaliera.
- `index.html` resta archivio / strumenti / amministrazione.
- `config/territory.json` è l'unica fonte territoriale.
- Supabase è il database operativo centrale.
- JSON pubblico contiene soltanto dati non sensibili necessari alle pagine pubbliche.
- `localStorage` è cache/offline queue, non source of truth.
- Facebook/Instagram restano PROPERTY MARKETING ENGINE; i seller lead possono confluire nell'Acquisition Engine.
- Nessuna inferenza automatica di proprietà, incarico scaduto o vendita senza evidenza verificabile.

## 1. Architettura completa

```text
FONTI PUBBLICHE / DATABASE PRIVATI AUTORIZZATI
                    |
                    v
             INGESTION ENGINES
                    |
                    v
            NORMALIZATION LAYER
                    |
        +-----------+-----------+
        |                       |
        v                       v
  PROPERTY GRAPH             LEAD GRAPH
(properties, observations,   (leads, contacts,
 agencies, history)           referrals, social)
        |                       |
        +-----------+-----------+
                    |
                    v
                EVENT ENGINE
                    |
                    v
                 TASK ENGINE
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
   OGGI.HTML   TELEFONATE    GIRO
        |           |           |
        +-----------+-----------+
                    |
                    v
                  CRM
                    |
                    v
            OUTCOME / KPI LAYER
```

## 2. Tree target

```text
/
├─ oggi.html                         # F1 Acquisition Command Center
├─ index.html                        # archivio / strumenti
├─ telefonate-oggi.html              # vista task CALL
├─ giro-acquisizione.html            # vista task FIELD
├─ crm.html                          # gestione lead/contatti
├─ competitor-intelligence.html      # property/agency intelligence
├─ social-seller-radar.html          # segnali pubblici seller
├─ f1-acquisition-core.js            # contratti, territorio, scoring, cache
├─ f1-acquisition-data.js            # data access Supabase/cache
├─ config/
│  ├─ territory.json                 # unica source of truth territoriale
│  └─ acquisition-engine.json        # pillars, stati, scoring, task types
├─ data/
│  └─ acquisition-public.json        # feed pubblico non sensibile
├─ scripts/
│  ├─ acquisition_daily.py           # pipeline pubblica giornaliera
│  ├─ competitor_engine.py           # fase successiva
│  └─ ...
├─ tests/
│  ├─ acquisition-command-center.spec.js
│  └─ test_acquisition_daily.py
├─ .github/workflows/
│  └─ f1-acquisition-daily.yml
└─ docs/
   └─ F1_ACQUISITION_5_PILLARS_ARCHITECTURE.md
```

## 3. Schema database

Entità target:

- `leads`: opportunità/persona/azienda e ragione commerciale.
- `contacts`: compatibilità con CRM esistente; progressiva convergenza verso `leads` + `interactions`.
- `properties`: identità stabile dell'immobile osservato.
- `property_observations`: osservazioni append-only.
- `agencies`: anagrafica competitor/partner.
- `property_agency_history`: intervalli osservati immobile↔agenzia.
- `sources`: fonti e regole di evidenza.
- `events`: eventi normalizzati e immutabili.
- `tasks`: coda azioni operative.
- `interactions`: telefonate, messaggi, incontri, sopralluoghi.
- `referrals`: rete segnalazioni.
- `campaigns`: Just Listed, Just Sold, Open House, farming, media/offline.
- `territories`: snapshot/versioni della configurazione territoriale.
- `social_signals`: segnali pubblici seller.

Le tabelle private sono protette da RLS e `user_id = auth.uid()`.

## 4. Mapping vecchio → nuovo

| Vecchio | Nuovo | Azione |
|---|---|---|
| `oggi.html` | Acquisition Command Center | MODIFY |
| `index.html` | Archivio/strumenti | KEEP |
| `f1-os-mobile.html` | funzioni assorbite in `oggi.html` | MERGE → ARCHIVE |
| `seller-radar-unico.html` | motore/segnali Pillar 1 | MODIFY |
| `seller-segnalati.html` | archivio segnali/evidenze | KEEP/MODIFY |
| `telefonate-oggi.html` | vista `tasks.task_type=CALL` | MODIFY |
| `giro-acquisizione.html` | vista `tasks.task_type=FIELD` | MODIFY |
| `crm.html` | lead/interactions | MODIFY progressivo |
| `neighborhood-intelligence.html` | intelligence territoriale | KEEP |
| `territory-control.html` | osservabilità territorio | KEEP |
| `radar-edilizio.html` | New Development Radar / segnali | KEEP/MODIFY |
| Facebook/Instagram dashboard | Property Marketing Engine | KEEP |
| workflow one-shot patch | storico | ARCHIVE dopo QA |
| Microzone v1/v2 | legacy | ARCHIVE dopo QA |
| CareerPilot | altro prodotto | MOVE TO OTHER REPO |
| CaseFamiglia | altro prodotto | MOVE TO OTHER REPO |

## 5. File da modificare — priorità

1. `config/territory.json` solo se cambia il perimetro, mai duplicarlo altrove.
2. `system-registry.json` per eliminare Susa hard-coded e riferimenti morti.
3. `supabase-schema.sql` per il data model 5 Pillars.
4. `oggi.html` per Command Center.
5. `pwa.js`/`sw.js` per cache delle nuove risorse.
6. `telefonate-oggi.html`, `giro-acquisizione.html`, `crm.html` in fase successiva.

## 6. File da creare

- `config/acquisition-engine.json`
- `f1-acquisition-core.js`
- `f1-acquisition-data.js`
- `data/acquisition-public.json`
- `scripts/acquisition_daily.py`
- `.github/workflows/f1-acquisition-daily.yml`
- `tests/test_acquisition_daily.py`
- `tests/acquisition-command-center.spec.js`
- `competitor-intelligence.html` (fase 2)
- `social-seller-radar.html` (fase 2)

## 7. File da archiviare dopo test verdi

- workflow `fix-*` e `patch-*` one-shot ormai applicati;
- `windows-bridge/f1_microzone_directory.py`;
- `windows-bridge/f1_microzone_directory_v2.py`;
- vecchi output QA;
- `f1-os-mobile.html` dopo migrazione delle funzioni residue;
- riferimenti e config `acquisitore-pro` obsoleti.

Nessuna rimozione prima del completamento della nuova QA.

## 8. Pipeline giornaliera

```text
01 acquisizione fonti
02 competitor scan
03 social seller scan
04 FSBO scan
05 revisione annunci già osservati
06 price-change detection
07 agency-change detection
08 listing-disappearance detection
09 database reactivation
10 referral queue
11 Just Listed / Just Sold triggers
12 scoring
13 deduplicazione
14 task generation
15 dashboard refresh
```

La pipeline pubblica non deve mai scrivere dati personali nel repository.

## 9. Data flow

```text
SOURCE
 -> raw observation
 -> normalized entity
 -> evidence
 -> event
 -> score
 -> task
 -> operator action
 -> interaction/outcome
 -> CRM state
 -> KPI
```

I record storici non vengono sovrascritti: le osservazioni e gli eventi sono append-only.

## 10. Event model

Eventi iniziali:

- `PROPERTY_FIRST_SEEN`
- `PROPERTY_PRICE_CHANGED`
- `PROPERTY_AGENCY_CHANGED`
- `PROPERTY_NOT_SEEN`
- `PROPERTY_RELISTED`
- `FSBO_FOUND`
- `SOCIAL_SELLER_FOUND`
- `JUST_LISTED`
- `JUST_SOLD`
- `PAST_CLIENT_DUE`
- `COI_DUE`
- `REFERRAL_RECEIVED`
- `OPEN_HOUSE_LEAD`
- `DIRECT_MAIL_RESPONSE`
- `WEBSITE_LEAD`
- `CALLBACK_DUE`

Ogni evento contiene `evidence_url`, `evidence_type`, `confidence` e `occurred_at` quando applicabile.

## 11. Task model

Campi minimi:

- `task_id`
- `lead_id`
- `property_id`
- `pillar`
- `task_type`
- `reason`
- `priority`
- `due_date`
- `assigned_to`
- `status`
- `created_at`
- `completed_at`
- `outcome`

Task types iniziali:

- `CALL`
- `FIELD`
- `FOLLOW_UP`
- `VERIFY`
- `REFERRAL`
- `CAMPAIGN`
- `REVIEW`

## 12. Wireframe `oggi.html`

```text
F1 ACQUISITION COMMAND CENTER
[territorio canonico] [sync] [data]

OGGI
[nuovi segnali] [da contattare] [richiami]
[appuntamenti] [valutazioni] [incarichi]

CORE 4
[clienti passati] [COI] [scaduti/possibili] [FSBO]

5 PILLARS
[1 Seller] [2 Database/Referral] [3 Farming]
[4 Partnership/Channels] [5 Core Business]

COMPETITOR INTELLIGENCE
[nuovi] [>30] [>60] [>90] [>120] [>150]
[ribassi] [cambi agenzia] [non più rilevati]

TERRITORIO
[hub] [comuni] [segnali] [azioni]

FUNNEL
lead -> contatto -> appuntamento -> valutazione -> incarico -> venduto

COSA DEVO FARE ADESSO
1. task ...
2. task ...
3. task ...
```

## 13. Piano migrazione

### Fase A — fondamenta

- centralizzare territorio;
- aggiungere config Acquisition Engine;
- estendere schema Supabase;
- creare contratti JS condivisi;
- creare feed pubblico e task queue locale/cloud-ready;
- aggiornare `oggi.html`.

### Fase B — motori

- competitor intelligence;
- FSBO normalization;
- social seller;
- expired/relisted;
- database reactivation;
- COI/referral.

### Fase C — viste operative

- Telefonate = task CALL;
- Giro = task FIELD;
- CRM = lead + interactions;
- Just Listed/Just Sold = campaign/event trigger.

### Fase D — cleanup

- nuova QA;
- eliminazione riferimenti morti;
- archiviazione patch storiche;
- separazione altri prodotti.

## 14. Piano QA

Minimo obbligatorio:

- `oggi.html` carica;
- `config/territory.json` carica;
- nessuna lista territoriale hard-coded nella nuova Command Center;
- pipeline genera JSON valido;
- nessun dato personale nel JSON pubblico;
- task deduplicati;
- score 0–100;
- property history append-only;
- event→task mapping;
- nessun 404 nei link core;
- PWA installabile;
- Seller→Task→Telefonata→CRM;
- Just Listed/Just Sold;
- FSBO/competitor/social signal.

## 15. Rischi

1. **RLS/schema non applicati nel progetto Supabase live**: il file SQL nel repository non esegue automaticamente la migration.
2. **Doppia source of truth durante la migrazione**: mitigazione con adapter e rollout progressivo.
3. **Workflow che scrivono `main`**: evitare che vecchi workflow riscrivano config/logica legacy.
4. **Dati personali nel repo pubblico**: feed pubblico deve essere allowlist-based e privo di telefono/email/nominativi privati.
5. **Classificazioni eccessive**: `VENDUTO` e `INCARICO_SCADUTO` richiedono evidenza esplicita.
6. **RPO/compliance**: un task CALL non equivale ad autorizzazione alla chiamata; deve mantenere gli stati di verifica necessari.
7. **Prestazioni**: i dataset attuali sono grandi; la dashboard non deve scaricare JSON multi-MB se non necessario.
8. **PWA cache stale**: versionare cache e feed.

## Definition of Done

Aprendo `oggi.html` l'operatore deve vedere opportunità, priorità, pilastro, ragione, immobile/territorio, prossima azione, richiami e funnel senza dover scegliere fra più dashboard concorrenti.
