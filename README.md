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

## Relationship & Territory Intelligence

La rete relazionale in `albero-fonti-notizie.html` è una parte operativa del Command Center, non un database separato.

Funzioni canoniche:

- mappa libera con nodi trascinabili, relazioni etichettate, gruppi, zoom e posizioni sincronizzate;
- scheda unica della persona con cronologia, 20 touch point/anno, trigger di cambiamento di vita e prossima azione;
- Relationship Score separato dal segnale immobiliare: la forza della relazione non viene interpretata come probabilità di vendita;
- percorso relazionale dalla radice `IO` alla persona per capire come nasce il collegamento;
- spiegazione "perché lavorarla adesso" basata su ricontatto dovuto, relazione ferma, segnale esplicito o evidenza da verificare;
- ricerca pubblica guidata (web, lavoro/azienda, notizie locali, profili pubblici, mappe/attività e fonti territoriali ufficiali);
- nessun risultato di ricerca viene associato automaticamente: l'operatore salva solo le evidenze pertinenti, con URL e stato `DA_VERIFICARE / VERIFICATO / SCARTATO`;
- i dati di Relationship Intelligence sono salvati in `network_contacts.tree_meta.publicIntelligence`, quindi restano nella stessa scheda cloud;
- `tree_meta` viene unito, non sostituito, così Territorio, Relazioni e Intelligence non cancellano i rispettivi metadati;
- `oggi.html` aggrega ricontatti dovuti, relazioni ferme, segnali da verificare ed evidenze pubbliche pendenti e apre direttamente la persona corretta.

Le regole delle fonti pubbliche sono centralizzate in `config/relationship-intelligence.json`. Non dedurre automaticamente proprietà, reddito, residenza o intenzione di vendere; non raccogliere recapiti privati da pagine casuali; rispettare sempre follow-up autorizzato, canale autorizzato, RPO/DNC e la fonte dell'evidenza.

## Address Intelligence

`address-intelligence.html` è il workspace di ricerca territoriale per una scheda immobiliare incompleta.

Il modulo:

- normalizza Comune, prezzo, tipologia e sigle come `BAGNI:3`;
- genera ricerche coordinate su Google, Bing, DuckDuckGo, Google Maps, OpenStreetMap e principali portali immobiliari;
- separa ricerca immobile, indirizzo candidato, attività commerciali, social territoriali e fonti urbanistiche;
- organizza la microzona nei raggi operativi 100 / 250 / 500 / 1000 metri;
- registra evidenze con fonte, URL, stato di verifica e soli contatti business pubblici;
- calcola un `F1 STREET SCORE` basato sui dati effettivamente disponibili e sulle evidenze verificate;
- esporta le evidenze in CSV e genera una sintesi operativa.

La workspace usa `localStorage` solo come cache di lavoro. Non sostituisce Supabase e non deve essere usata per costruire un database di residenti o numeri privati.

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