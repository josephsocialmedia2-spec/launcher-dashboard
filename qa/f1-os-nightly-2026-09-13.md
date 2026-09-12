# F1 OS Nightly QA — 2026-09-13

Esecuzione automatica non interattiva. Regola: PASS solo per funzioni realmente verificate; BLOCCATO quando serve PC Windows, localhost, dispositivo reale o intervento umano.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Albero `main` completo e commit HEAD | PASS | Nessuno | Nessuna | PASS — HEAD `c32a052fe199900a48f6e0a493af21fc7a2d203b` |
| OGGI COSA FACCIO | Presenza `oggi.html` nell'albero canonico | PASS | Nessuno | Nessuna | PASS |
| Link obsoleti | Ricerca `market-intelligence.html` e `incrocio-giro-contatti.html` nel codice corrente | PASS | I due riferimenti che nei QA precedenti causavano 404 non risultano più presenti | Nessuna: problema già rimosso nel codice corrente | PASS |
| Registry | Presenza `system-registry.json` e coerenza con i moduli canonici attuali | PASS strutturale | Test runtime dei target non eseguito su browser reale | Nessuna | PASS strutturale |
| PWA | `manifest.webmanifest`, `pwa.js`, `sw.js`; lista precache confrontata con albero repo | PASS strutturale | Installazione/offline reale non testabile senza browser/dispositivo | Nessuna | PASS strutturale |
| Service Worker | Precache usa `Promise.allSettled`; file statici principali presenti nel repo | PASS | Nessuno rilevato nel controllo sorgenti | Nessuna | PASS |
| GitHub build/status | Status API su HEAD | NON CERTIFICATO | HEAD restituisce `pending` con `total_count: 0`; questo endpoint non certifica il workflow Pages/Actions | Nessuna | NON CERTIFICATO |
| GitHub Pages live | Apertura reale e navigazione browser delle pagine | BLOCCATO | Browser live Pages non disponibile in questa esecuzione | Nessuna | BLOCCATO |
| Supabase / cloud | Query SQL reale sulle tabelle operative | PASS connessione / FAIL dati | `contacts=0`, `field_visits=0`, `f1_records=0`, `f1_daily_backups=0` | Nessuna: vietato creare dati fittizi per rendere verde il QA | FAIL dati invariato |
| CRM | `crm.html` presente nel repo; infrastruttura sync presente (`supabase-sync.js`, `field-sync.js`) | PASS strutturale / NON CERTIFICATO E2E | Nessun record reale cloud con cui certificare CRUD+sync | Nessuna | NON CERTIFICATO E2E |
| Backup cloud | Conteggio `f1_daily_backups` | FAIL | 0 backup registrati | Nessuna: non creato backup artificiale | FAIL |
| Restore | Ripristino reale da backup | BLOCCATO | Nessun backup cloud disponibile e nessun PC locale accessibile | Nessuna | BLOCCATO |
| Radar Edilizio | Lettura log reale `data/radar_scan_log.json` | FAIL / STALE | Ultima scansione: 2026-09-09; 4 errori ConnectTimeout: Meana di Susa, Giaglione, Venaus, Bussoleno | Nessuna correzione automatica: endpoint esterni e assenza di una nuova run verificata | FAIL / STALE |
| Seller Radar | Sorgenti `seller-radar-unico.html`, `seller-segnalati.html` e commit recenti presenti | PASS strutturale | Funzionamento browser e raccolta reale non eseguiti | Nessuna | PASS strutturale |
| Microzone / Directory Radar | Motori V1/V2/V3 e installer Windows presenti | PASS strutturale / BLOCCATO E2E | Selenium/Chrome/database/output `LISTA_MATTINO` richiedono Windows reale | Nessuna | BLOCCATO E2E |
| Centrale Telefonate / bridge | Verifica sorgenti Windows disponibili | BLOCCATO E2E | Servizio locale/porta e stato processo sul PC non raggiungibili | Nessuna | BLOCCATO |
| App smartphone | `f1-os-mobile.html`, `directory-radar-mobile.html`, `gestione-app.html` presenti | PASS strutturale / BLOCCATO E2E | Installazione PWA, microfono, offline, rete LAN e sync richiedono smartphone reale | Nessuna | BLOCCATO E2E |
| Funnel Engine | Ricerca codice canonico per `funnel` | FAIL / NON IDENTIFICATO | Nessun modulo F1 canonico identificato dalla ricerca nel repository corrente | Nessuna: non assimilati moduli non equivalenti | FAIL |
| Role Play | Ricerca codice canonico per `role play` | FAIL / NON IDENTIFICATO | Nessun modulo F1 Role Play identificato dalla ricerca nel repository corrente | Nessuna | FAIL |
| Integrazioni | GitHub e Supabase raggiunti realmente | PASS parziale | Windows/local network/browser device non raggiungibili | Nessuna | PASS per GitHub/Supabase; BLOCCATO per locale |

## Esito finale

**NON CERTIFICATO.** Non risultano regressioni sui vecchi link 404: `market-intelligence.html` e `incrocio-giro-contatti.html` non sono più referenziati nel codice corrente. Restano però errori/blocchi aperti: Radar Edilizio fermo a una scansione del 9 settembre con 4 timeout, cloud operativo ma senza record e senza backup, Funnel Engine e Role Play canonici non identificati, e test Windows/smartphone/localhost non eseguibili da questo ambiente.

Nessuna correzione di produzione è stata applicata in questa run perché gli errori residui non hanno una correzione automatica sicura e verificabile senza inventare target, dati o stato del PC locale.
