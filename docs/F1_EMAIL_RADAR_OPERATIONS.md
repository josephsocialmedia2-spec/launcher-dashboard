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
- REGISTRO IMPRESE / INFOCAMERE: contratto/credenziali richiesti (`REGISTRO_IMPRESE_API_BASE`, `REGISTRO_IMPRESE_API_KEY`).
- INI-PEC: consultazione pubblica; automazione massiva non dichiarata disponibile senza modalità autorizzata.
- INAD: consultazione pubblica; automazione esterna non dichiarata disponibile senza modalità autorizzata.
- ALBI PROFESSIONALI: architettura adapter-based predisposta; singole fonti da configurare.
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
