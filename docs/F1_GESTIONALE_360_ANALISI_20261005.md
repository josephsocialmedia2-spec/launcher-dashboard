# F1 Gestionale 360 — Analisi funzionale e implementazione

Data: 05/10/2026

## Obiettivo

Portare F1 da centrale di acquisizione già avanzata a gestionale immobiliare integrato, senza duplicare ciò che esiste. Il modello operativo resta:

NOTIZIA / SEGNALE → PERSONA → IMMOBILE → ATTIVITÀ → RICHIESTA → MATCH → APPUNTAMENTO → VALUTAZIONE → INCARICO → DOCUMENTI → PUBBLICAZIONE → VISITE → PROPOSTA → TRATTATIVA → VENDUTO.

## Benchmark analizzato

### Gestim
Riferimenti:
- https://www.gestim.it/panoramica-delle-funzioni/
- https://www.gestim.it/

Funzioni rilevanti: censimento di zona, gestione contatti, incrocio automatico, agenda, notifiche, statistiche, portali, privacy/firma, workflow documentale.

### Realgest
Riferimenti:
- https://www.realgest.it/
- pagine funzionali relative a richieste, matching, MLS e multi-invio.

Funzioni rilevanti: richieste collegate ai contatti, matching bidirezionale, MLS, planner, portafoglio, modulistica, pubblicazione multicanale, gestione agenti.

### Tecnocasa / TecnoCloud
Riferimenti:
- https://www.salesforce.com/it/customer-stories/tecnocasa/
- https://www.smau.it/casi-di-successo/tecnocloud-lasso-nella-manica-degli-agenti-immobiliari-un-crm-in-mobilita-per-soddisfare-le-esigenze-del-cliente

Pattern rilevante: un unico database cloud condiviso, fruibile anche in mobilità, con informazioni su clienti acquisiti e potenziali e coordinamento della rete.

### Fonti valutative pubbliche
Riferimenti:
- https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/omi
- servizio Valori Immobiliari Dichiarati dell'Agenzia delle Entrate.

OMI e valori dichiarati sono fonti di supporto. Non devono essere presentati come una perizia automatica definitiva.

## Stato F1 prima dell'intervento

### Già presente e da conservare

1. **Acquisizione territoriale / Banca Notizie**
   - Seller Radar.
   - Territory Control.
   - Telefonate Oggi.
   - Navigatore Notiziere mobile.
   - civici, osservazioni, persone, notizie, foto, fonte, richiami e handoff al CRM.

2. **CRM**
   - 4.991 lead nel database alla verifica del 05/10/2026.
   - 2.021 immobili.
   - task, interazioni, prossime azioni, RPO/DNC, import Excel, controllo duplicati.
   - ruoli e pipeline multiple già implementati a livello schema/UI.

3. **Pipeline**
   - Proprietario/Venditore: nuovo → contatto → qualifica → appuntamento → valutazione → incarico.
   - Acquirente: nuovo → qualificato → ricerca → match → visita → proposta → trattativa → acquistato.
   - Immobile: segnalazione → valutazione → incarico → pubblicato → visite → proposta → venduto.

4. **Agenda / operatività**
   - task con scadenza e priorità.
   - OGGI come coda operativa.
   - Notiziere mobile e Territory Mobile.
   - KPI collaboratori nel pannello titolare.

5. **Matching già abbozzato**
   - f1_house_requests.
   - f1_crm_requests.
   - f1_match_scores.
   - f1_match_results.
   - f1_market_opportunities.
   - Prima dell'intervento: 0 richieste attive e 0 match, quindi funzione tecnicamente presente ma non alimentata.

6. **Documenti**
   - documenti-vendita.html era una checklist statica, non un registro persistente.

### Gap reali individuati

- assenza di una schermata interna per creare richieste acquirenti CRM e vedere subito i match;
- matching CRM non attivato nel feature flag;
- ruoli CRM esistenti ma senza backfill sui lead già classificati;
- nessun archivio strutturato delle valutazioni;
- checklist documenti non persistente;
- nessun registro unificato dello stato di distribuzione sui canali;
- funzioni disperse e non raggiungibili direttamente da OGGI.

## Implementazioni 05/10/2026

### 1. Demand Engine CRM
File:
- f1-demand-engine.html
- f1-demand-engine.js
- supabase-migrations/20261005_f1_crm_internal_matching_engine.sql

Funzioni:
- selezione del contatto CRM;
- inserimento richiesta;
- comune + zone alternative;
- budget;
- tipologia;
- mq;
- camere/bagni;
- box, giardino, ascensore, terrazzo, posto auto;
- urgenza e note;
- ruolo ACQUIRENTE / RICERCA_ATTIVA;
- matching automatico contro opportunità attive;
- elenco match ≥60;
- evidenza match ≥85;
- chiamata cliente, annuncio e CRM.

Il punteggio è spiegabile e non predittivo opaco: zona/comune, budget, tipologia, superficie, camere e dotazioni.

### 2. Ruoli CRM pregressi
Sono stati creati esclusivamente ruoli derivabili in modo esplicito dal campo source_type:
- 936 CENTRO_INFLUENZA;
- 385 CONTATTO_TERRITORIALE;
- 3 VENDITORE da FSBO espliciti.

Non sono stati trasformati MARKET_LISTING, COMPETITOR_LISTING o FSBO_CANDIDATE in proprietari/venditori.

### 3. Valutazioni
File:
- f1-valutazioni.html
- tabella f1_property_valuations
- migration 20261005_f1_agency_360_valuation_documents_distribution.sql

Registra:
- immobile;
- zona e semestre OMI;
- range OMI €/mq;
- superficie;
- correzione motivata;
- valori dichiarati comparabili;
- comparabili di mercato;
- range stimato;
- prezzo consigliato;
- stato della valutazione;
- storico.

La pagina separa esplicitamente fonte ufficiale, comparabili e giudizio professionale.

### 4. Registro documentale
File:
- f1-documenti-immobile.html
- documenti-vendita.html aggiornato con collegamento al registro;
- tabella f1_property_documents.

Stati:
MISSING → REQUESTED → RECEIVED → VERIFIED / EXPIRED / NOT_APPLICABLE.

Campi:
- tipologia documento;
- immobile;
- stato;
- link/file;
- emissione/scadenza;
- note e metadati.

### 5. Controllo distribuzione
File:
- f1-distribuzione-immobili.html
- tabella f1_listing_distribution.

Canali iniziali:
- SITO F1;
- IMMOBILIARE.IT;
- IDEALISTA;
- CASA.IT;
- MLS;
- VIRTUAL TOUR 360.

Stati:
NOT_READY → READY → QUEUED → PUBLISHED / PAUSED / ERROR / REMOVED.

Il registro non finge di effettuare multiposting: l'invio effettivo richiede feed/API/credenziali autorizzate del provider.

### 6. OGGI come accesso unico
oggi.html contiene un nuovo pannello GESTIONALE 360 con accessi diretti a:
- Banca Notizie;
- Demand Engine;
- CRM & Pipeline;
- Valutazioni;
- Registro Documentale;
- Distribuzione;
- Portafoglio;
- KPI Team.

### 7. Sicurezza database
Le tre nuove tabelle:
- hanno RLS attiva;
- negano accesso anonimo;
- hanno grant espliciti per authenticated;
- usano le funzioni di autorizzazione F1 già esistenti;
- consentono delete solo al titolare.

La nuova vista matching CRM usa security_invoker=true.

Gli advisor Supabase evidenziano anche avvisi storici su altri moduli del progetto; non sono stati introdotti dalle nuove tabelle e vanno trattati come backlog di hardening separato.

## Cosa resta da integrare con servizi esterni

1. Multiposting reale
   Richiede API/feed/credenziali dei portali. Il registro è pronto a gestirne stato, external_id, URL ed errori.

2. MLS esterna
   Il CRM è pronto per uno stato/canale MLS, ma lo scambio con una rete terza richiede protocollo e autorizzazioni della rete scelta.

3. Firma elettronica qualificata/avanzata
   Richiede provider e processo di firma scelto. Non va simulata dal browser.

4. Import automatico OMI / valori dichiarati
   Il modulo salva i valori e la provenienza; l'automazione completa dipende dalla modalità di accesso ufficialmente consentita ai dati.

## Principio architetturale finale

GitHub Pages = interfaccia operativa.
Supabase = archivio transazionale e autorizzato.
Seller Radar / Territory = acquisizione segnali.
CRM = memoria persone/immobili/attività.
Demand Engine = domanda/offerta.
OGGI = cabina di regia.

Non devono esistere duplicazioni parallele dello stesso dato: ogni nuovo modulo deve collegarsi agli ID già esistenti di lead, property e task.
