# F1 OS — Nightly QA — 05/09/2026

Stato release: **BLOCCATA / NON CERTIFICATA END-TO-END**

Regola: PASS solo per test realmente eseguiti. BLOCCATO per componenti che richiedono il PC Windows, localhost, browser/dispositivo reale o una sorgente canonica non distribuibile in sicurezza da questo controllo.

| Componente | Test eseguito | Esito | Errore / rilievo | Correzione applicata | Retest |
|---|---|---|---|---|---|
| OGGI COSA FACCIO | Verifica sorgente canonica `oggi.html`, registry e dipendenze dichiarate | PASS STRUTTURALE | La Centrale usa `127.0.0.1:8766`, non verificabile dal cloud | Nessuna modifica al link locale senza test PC | BLOCCATO end-to-end Windows |
| GitHub Pages | Build/deploy dopo le correzioni | PASS | — | — | Workflow Pages `success` sul commit `3500a80...` |
| F1 Microzone Directory QA | Compilazione V1/V2/V3 + gate installer | PASS | L'installer distribuiva V1, mentre la logica Seller Signal + vie vicine è in V2/V3 | Installer aggiornato a V3; QA esteso a V1/V2/V3 e controllo versione installer | PASS, GitHub Actions |
| Seller Signal → vie vicine → contatti pubblici | Verifica statica catena V1/V2/V3 | PASS STRUTTURALE / BLOCCATO E2E | Il V3 usa via centrale + fino a 4 vie vicine e fonti pubbliche; esecuzione Selenium/Chrome e database locale richiedono Windows | Installer ora distribuisce V3 | QA codice PASS; ricerca Internet reale BLOCCATA fino al PC |
| CAPTCHA alert workflow | Parsing/configurazione workflow | PASS SINTASSI / NON TESTATO E2E | Workflow YAML non valido; veniva registrato un run immediatamente fallito senza job | Riscritto blocco multilinea `gh issue comment` in YAML valido | Nessun nuovo errore di parsing; dispatch reale non eseguito |
| Supabase progetto | Stato progetto | PASS | Progetto ACTIVE_HEALTHY | — | PASS |
| Supabase CRM sync schema | Verifica tabelle attese da `supabase-config.js`/`supabase-sync.js` | FAIL → CORRETTO | `contacts` e `field_visits` non esistevano, quindi il client avrebbe ricevuto errore REST | Applicata migration `create_f1_crm_contacts_and_field_visits` con RLS e policy authenticated | PASS schema: entrambe presenti, RLS=true, conteggio 0/0 |
| Supabase security | Security Advisor | FAIL PARZIALE → CORRETTO PARZIALE | `f1_apply_mobile_action()` SECURITY DEFINER era eseguibile da anon/authenticated | Revocato EXECUTE a public/anon/authenticated | PASS per quel warning; restano advisor aperti elencati sotto |
| Supabase dati/sync reale | Conteggi e persistenza | NON TESTATO END-TO-END | Tabelle CRM nuove e vuote; nessuna sessione utente/dispositivo reale usata nel test | Nessuna creazione di dati utente fittizi in produzione | BLOCCATO fino a login/client reale |
| Backup cloud | Verifica `f1_daily_backups` | FAIL | 0 righe di backup; nessun restore test eseguibile con dati reali | Nessun backup artificiale creato senza owner/dati reali | FAIL aperto |
| Desktop F1 OS 1.5 | `python -m py_compile` sulla sorgente disponibile in Library | PASS SINTASSI | Sorgente non coincide necessariamente con l'installazione Windows corrente | — | PASS compile; runtime Windows BLOCCATO |
| Funnel Engine desktop | Analisi formula + test casi limite | FAIL | Con input negativi produce vendite/incarichi/appuntamenti/notizie/contatti negativi; zero conversione produce 0 invece di errore/validazione | Non patchato: sorgente disponibile in Library ma non identificata come sorgente canonica distribuita sul PC | FAIL aperto |
| Backup desktop | Analisi funzione `backup()` | FAIL REQUISITO | Crea copia SQLite, ma non è presente un restore test equivalente nella funzione verificata | Non patchato senza sorgente canonica installata | BLOCCATO/FAIL |
| CRM web | `crm.html` presente; schema cloud corretto | NON TESTATO E2E | Nessun login/browser corrente con CRUD completo | Schema cloud corretto | BLOCCATO E2E browser |
| Radar | File Radar, Seller Radar e dati presenti | PASS STRUTTURALE | Browser/live fetch non certificato qui | — | NON TESTATO E2E |
| Role Play | Risorsa Role Play Academy trovata in Library e link pubblico storico | NON TESTATO | Non presente come modulo testabile nel repository canonico `launcher-dashboard`; fetch web della pagina non riuscito in questa esecuzione | Nessuna correzione sicura | BLOCCATO |
| PWA / smartphone | `manifest.webmanifest`, `pwa.js`, `sw.js` presenti; Pages build PASS | PASS STRUTTURALE / BLOCCATO E2E | Installazione Home Screen, offline, audio/Role Play e sync non testabili senza dispositivo/browser reale | — | BLOCCATO E2E |
| Centrale Telefonate locale | Registry e `oggi.html` puntano a `127.0.0.1:8766` / `f1-radar.local:8766` | BLOCCATO | Servizio locale Windows non raggiungibile da QA cloud | Nessuna falsa correzione | BLOCCATO |

## Correzioni effettuate

1. `windows-bridge/INSTALLA_MOTORE_MICROZONA.bat` ora scarica/esegue `f1_microzone_directory_v3.py`, non più V1.
2. `.github/workflows/f1-microzone-directory-qa.yml` ora compila V1/V2/V3 e blocca regressioni dell'installer verso V1.
3. `.github/workflows/f1-captcha-alert.yml` corretto: YAML multilinea valido.
4. Supabase: create `contacts` e `field_visits`, RLS e policy per utenti autenticati applicate.
5. Supabase: revocato accesso RPC diretto pubblico/anon/authenticated alla trigger function SECURITY DEFINER `f1_apply_mobile_action()`.

## Errori/blocchi ancora aperti

- **Windows watchdog / localhost 8766:** impossibile certificare avvio, health check, browser locale e riavvio del PC da questo ambiente.
- **Seller Signal contatti pubblici:** il percorso V3 è ora quello installato dal pacchetto, ma Selenium/Chrome + ricerca PagineBianche/PagineGialle + output `LISTA_MATTINO.html` devono essere eseguiti sul PC per un PASS end-to-end.
- **Funnel Engine:** manca validazione dei valori negativi/percentuali impossibili e gestione esplicita delle conversioni zero.
- **Backup:** `f1_daily_backups` ha 0 backup; nessun backup+restore reale è stato verificato. Il desktop verificato crea solo la copia SQLite, non dimostra il ripristino.
- **Role Play:** non certificato end-to-end nell'entrypoint canonico.
- **Smartphone/PWA:** build web riuscita, ma installazione/offline/sync/Role Play su dispositivo reale non certificati.
- **Supabase Security Advisor:** restano INFO per RLS senza policy su `f1_buyer_leads`, `f1_buyer_lead_events`, `f1_lead_magnets` (non modificati perché potrebbe essere intenzionale) e WARN per Leaked Password Protection disabilitata.

## Release gate

**RELEASE BLOCCATA.** I fix cloud e di distribuzione V3 sono stati applicati e ritestati dove possibile, ma non esiste ancora prova end-to-end del PC Windows, backup+restore, Funnel con input invalidi, Role Play e smartphone reale.
