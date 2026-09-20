# F1 EMAIL RADAR — OPERATIONS

## Stato territoriale canonico
La fonte canonica è `config/territory.json`, replicata nella tabella Supabase `territories`.
Le versioni Supabase v2 e v4 contengono entrambe 17 Comuni a sinistra + 24 a destra = **41 Comuni**.
Il front-end deve derivare il numero dalla configurazione e non hardcodare 40.

## ATECO 2025
La Edge Function `f1-email-radar-ateco-sync` legge il foglio ufficiale ISTAT `ATECO 2025 Struttura`.
La sincronizzazione è accettata solo se risultano:
- totale 3257;
- livello 1: 22;
- livello 2: 87;
- livello 3: 287;
- livello 4: 651;
- livello 5: 920;
- livello 6: 1290.

Il catalogo live è stato popolato il 20/09/2026. L'endpoint richiede JWT F1.

## Orchestratore
Edge Function: `f1-email-radar-orchestrator`.

Azioni:
- START
- PAUSE
- RESUME
- RETRY
- STOP
- CRON

Autenticazione:
- utente: JWT Supabase + profilo F1 ACTIVE;
- Cron: token generato nel database, plaintext in Supabase Vault, solo SHA-256 nella runtime config.

## Provider
- SITI_UFFICIALI: operativo.
- BRAVE SEARCH: chiamata API implementata, richiede `BRAVE_SEARCH_API_KEY`.
- GOOGLE PLACES (NEW): chiamata Text Search implementata, richiede `GOOGLE_MAPS_API_KEY`. Usata solo per discovery; il record viene salvato dopo verifica sul sito ufficiale.
- REGISTRO IMPRESE / INFOCAMERE: connettore contrattuale operativo a configurazione completata. Richiede base/path/API key/header e mapping risposta indicati in `supabase/.env.example`; nessun endpoint o schema contrattuale viene inventato.
- INI-PEC: consultazione pubblica; automazione massiva non dichiarata disponibile senza modalità autorizzata.
- INAD: consultazione pubblica; automazione esterna non dichiarata disponibile senza modalità autorizzata.
- ALBI PROFESSIONALI: architettura adapter-based + catalogo `f1_email_radar_public_sources`. Sono registrate le fonti ufficiali Torino per Geometri, Architetti, Ingegneri, Commercialisti e Avvocati; restano `READY_PARTIAL` quando la fonte è interattiva e non offre un connettore massivo documentato.
- FONTI LOCALI: provider parziale; richiede configurazione per ente/comune.

## Sicurezza e marketing
Il database territoriale non alimenta automaticamente `email_marketing_contacts`.
Email pubblica non equivale a consenso marketing. PEC resta distinta dall'email ordinaria.
Service role e chiavi provider non devono mai essere presenti in GitHub Pages.

## Cron
Job: `f1-email-radar-daily-refresh`
Schedule: `15 3 * * *` (UTC).
Il job invoca l'orchestratore con token letto da Supabase Vault.

## Pilot Avigliana
Il pilot resta INCOMPLETE finché fonti/categorie applicabili non sono completate.
I KPI non devono trasformare un campione QA in una dichiarazione di censimento completo.


## Deduplicazione server-side
La discovery automatica usa `f1_email_radar_service_upsert_entity`, RPC eseguibile soltanto dal `service_role`.
Ordine di riconciliazione: P.IVA → PEC → email+Comune → dominio+Comune → denominazione+Comune+indirizzo.
Le fonti restano storicizzate separatamente; il database marketing non viene alimentato automaticamente.

## Fonti professionali ufficiali
La tabella `f1_email_radar_public_sources` contiene il catalogo delle fonti professionali verificate.
Per l'Ordine Ingegneri Torino è applicato `NON_USARE_MARKETING` perché la fonte stessa limita i contatti pubblicati alle comunicazioni professionali e non promozionali.

## Stato rollout
La queue contiene 41 Comuni canonici. Avigliana resta `PILOT`; gli altri restano `WAITING_PILOT` finché il pilot non raggiunge realmente `COMPLETED`.


## Autonomous zero-credential pipeline — 20/09/2026

Provider obbligatori per `COMPLETED`:
1. `OSM_DIRECTORY` — OpenStreetMap/Overpass con area Wikidata e fallback fra istanze pubbliche documentate.
2. `FONTI_LOCALI` — sito comunale da Wikidata + robots.txt + sitemap + link territoriali.
3. `SITI_UFFICIALI` — crawler incrementale con JSON-LD/Schema.org, mailto/tel/VAT, provenance e gestione URL non raggiungibili.
4. `ATECO_ANALYSIS` — analisi delle 87 divisioni ATECO 2025 sui soggetti scoperti.

Brave Search, Google Places e Registro Imprese/InfoCamere sono enrichment opzionali. INI-PEC, INAD e albi interattivi sono `INTERACTIVE_NOT_REQUIRED`; nessuno di questi provider può bloccare il completion engine.

OpenStreetMap è usato a basso volume, in modo seriale e con attribution ODbL. Il sistema usa direttamente le coordinate OSM/JSON-LD e non dipende dal bulk geocoding Nominatim.

Il circuit breaker registra failure/retry; se tutte le istanze Overpass previste falliscono in un run, quel provider diventa `NON_APPLICABILE` per il run e la pipeline continua. Le scansioni future potranno ritentarlo.

## QA produzione

- ATECO cron auth: PASS, 3257 record (22/87/287/651/920/1290).
- Avigliana: COMPLETED con pipeline autonoma.
- Villar Dora: COMPLETED con la pipeline generica.
- Queue: dopo Avigliana è stata sbloccata e il CRON è avanzato autonomamente a Villar Dora e poi Chianocco.
- START/RESUME/RETRY/CRON: verificati in produzione.
- PAUSE: PASS.
- STOP da stato PAUSED: bug corretto e PASS su run temporaneo cancellato.
- Edge Functions: orchestrator v16; ATECO sync v9 al momento di questo snapshot.
