# F1 OS Nightly QA — 2026-09-16

Esecuzione automatica non interattiva. PASS solo per funzioni realmente verificate; BLOCCATO quando serve PC Windows, localhost, dispositivo reale, credenziali/sessione non disponibile o intervento umano.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Accesso repository canonico, albero `main`, HEAD | PASS | Nessuno | Nessuna | PASS — HEAD iniziale `1a8550be9fca6ae502d082fbafd042202f8d52a0` |
| OGGI COSA FACCIO | Fetch reale `oggi.html`, manifest e sorgenti dichiarate | PASS strutturale | Runtime browser non eseguito | Nessuna | PASS strutturale |
| GitHub Pages build/deploy | Run Pages #1033 sul HEAD iniziale | PASS | Nessuno | Nessuna | PASS — `completed/success` |
| GitHub Pages / Google Dork Companion smoke | Ultimo workflow QA fallito del 15/09, step Published Pages smoke | FAIL storico non risolto da run QA successiva sul nuovo HEAD | Lo smoke ha atteso 60x5s e non ha trovato contemporaneamente gli asset/versioni pubblicati richiesti; gli step syntax/contract precedenti erano PASS | Nessuna: il deploy Pages successivo è PASS ma non equivale al retest dello specifico workflow | FAIL / RETEST MANCANTE |
| PWA | `oggi.html` dichiara `manifest.webmanifest` e `pwa.js`; struttura repository disponibile | PASS strutturale | Installazione/offline reale richiede browser/dispositivo | Nessuna | BLOCCATO E2E |
| CRM | Workflow e sorgenti CRM presenti nell'albero; recenti commit normalizer CRM | PASS strutturale / NON CERTIFICATO E2E | Nessun record cloud reale con cui verificare CRUD/sync end-to-end | Nessuna | NON CERTIFICATO E2E |
| Supabase / cloud | Stato progetto + query SQL reale | PASS connessione / FAIL dati operativi | Progetto ACTIVE_HEALTHY; `contacts=0`, `field_visits=0`, `f1_records=0`, `f1_daily_backups=0` | Nessuna: non creati dati artificiali | FAIL dati invariato |
| Sicurezza cloud | Supabase Security Advisor reale | FAIL / WARN | 7 tabelle RLS senza policy; 2 funzioni con search_path mutabile; `pg_net` in `public`; 2 SECURITY DEFINER eseguibili da authenticated; leaked-password protection disabilitata | Nessuna: modifiche possono alterare autorizzazioni/comportamento produzione | FAIL invariato |
| Backup cloud | Conteggio reale `f1_daily_backups` | FAIL | 0 backup registrati | Nessuna: non creato backup fittizio | FAIL |
| Restore | Ripristino reale | BLOCCATO | Nessun backup cloud disponibile e nessun PC locale raggiungibile | Nessuna | BLOCCATO |
| Radar Edilizio | Lettura reale `data/radar_scan_log.json` | FAIL / STALE | Ultima scansione 2026-09-09; 4 ConnectTimeout: Meana di Susa, Giaglione, Venaus, Bussoleno | Nessuna: endpoint esterni e nessuna nuova scansione verificata | FAIL / STALE |
| Seller Radar | Presenza collegamento/moduli nell'Acquisition Command Center | PASS strutturale | Raccolta/browser reale non eseguiti | Nessuna | BLOCCATO E2E |
| Microzone / Directory Radar | Workflow dedicati presenti nell'albero | PASS strutturale / BLOCCATO E2E | Selenium/Chrome/SQLite/output/processi Windows richiedono PC reale | Nessuna | BLOCCATO E2E |
| Centrale Telefonate / bridge | Componenti locali non testabili da questa run | BLOCCATO E2E | localhost/LAN/PC Windows non raggiungibili | Nessuna | BLOCCATO |
| Role Play | Componenti/test già presenti nelle verifiche precedenti; nessun runtime audio disponibile in questa run | PASS strutturale precedente / BLOCCATO E2E | Microfono/audio/browser reale non disponibili | Nessuna | BLOCCATO E2E |
| App smartphone | Workflow guida smartphone e componenti mobile presenti nell'albero | PASS strutturale / BLOCCATO E2E | Installazione PWA, offline, microfono, LAN e sync richiedono dispositivo reale | Nessuna | BLOCCATO E2E |
| Funnel Engine | `oggi.html` contiene funnel Lead→Contatto→Appuntamento→Valutazione→Incarico→Venduto, ma ricerca esplicita `Funnel Engine` non identifica un modulo canonico separato | PASS UI funnel / FAIL identificazione motore canonico | Nessun componente esplicitamente certificabile come `Funnel Engine` separato | Nessuna | NON CERTIFICATO |
| Integrazioni | GitHub + Supabase interrogati realmente | PASS parziale | Windows/local network/browser-device non raggiungibili | Nessuna | PASS GitHub/Supabase; BLOCCATO locale |

## Esito finale

**NON CERTIFICATO.** Pages sul HEAD iniziale è PASS, ma resta una regressione/assenza di retest specifico: l'ultimo `F1 Google Dork Companion QA` ha fallito esclusivamente lo step `Published Pages smoke` dopo che syntax e contratti locali erano passati. Persistono inoltre Radar Edilizio stale con 4 timeout, cloud senza record operativi e senza backup, warning di sicurezza Supabase, restore impossibile senza backup, Funnel Engine separato non identificato e test Windows/localhost/smartphone/audio E2E bloccati.

Nessuna correzione di produzione è stata applicata: i problemi residui richiedono un retest workflow specifico, dati reali, decisioni di sicurezza o accesso a PC/dispositivo; forzare record, policy o destinazioni avrebbe falsato o rischiato il QA.
