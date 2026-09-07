# F1 OS — Nightly QA — 2026-09-08

## Stato finale

**RELEASE NON CERTIFICATA / BLOCCATA.**

È stata applicata una correzione sicura al Service Worker PWA. Restano errori strutturali e funzioni non certificabili senza PC/dispositivo reale.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| OGGI COSA FACCIO | Verifica entrypoint canonico `oggi.html`, manifest e bootstrap PWA | PASS strutturale | Test browser/device completo non disponibile | Nessuna | Sorgenti verificate sul commit corrente |
| Link OGGI → Market Intelligence | Confronto href con albero repository | FAIL | `oggi.html` punta a `market-intelligence.html`, file assente dal repository canonico | Nessuna: destinazione corretta non identificata con certezza | FAIL confermato |
| System Registry | Confronto path registrati con albero repository | FAIL | `incrocio-giro-contatti.html` e `market-intelligence.html` risultano registrati ma assenti; `windows_valle_susa/f1_mobile_server.py` non è presente nel repository corrente | Nessuna: non rimuovere funzioni richieste senza identificare la sorgente canonica | FAIL confermato |
| PWA Service Worker | Verifica lista `STATIC` contro file realmente presenti nel repository | FAIL → CORRETTO | `sw.js` conteneva `incrocio-giro-contatti.html` e `market-intelligence.html`, entrambi assenti; `cache.addAll()` avrebbe potuto far fallire l'installazione della cache | Rimossi soltanto i due asset inesistenti dalla pre-cache e incrementata cache a `f1-operativo-v20260908-pwa-cache-fix` | PASS strutturale: tutti gli asset rimasti in `STATIC` risultano presenti nell'albero corrente |
| GitHub Pages | Build/deploy sul commit della correzione PWA | PASS | — | Commit `c18eee505b946c6176caee57117ab14ff2f24292` | Run Pages 493 conclusa `success` |
| Radar Edilizio | Unit test, JS syntax, smoke test Pages e prima scansione del workflow corrente | PASS parziale / IN CORSO | Il workflow non era ancora terminato: secondo pass deduplication ancora in esecuzione al momento del registro | Nessuna | Step 1–10 PASS; release gate del workflow non ancora concluso |
| Radar dataset/log | Verifica ultimo `data/radar_scan_log.json` prima della run corrente | NON CERTIFICATO FRESCO | Snapshot precedente datato 2026-09-02; la nuova run stava ancora completando dedup/commit | Nessuna | Attendere conclusione workflow senza dichiarare PASS finale |
| Seller Signal → vie vicine → contatti pubblici | Verifica installer Windows | PASS strutturale / BLOCCATO E2E | Installer distribuisce V3 e pianifica task 04:30, ma Selenium/Chrome, DB locale e `LISTA_MATTINO.html` richiedono PC reale | Nessuna | Sorgente installer riletta; esecuzione Windows non disponibile |
| Centrale Telefonate | Verifica dipendenze locali dichiarate | BLOCCATO | `127.0.0.1:8766` / `f1-radar.local:8766` richiedono servizio sul PC reale; path server dichiarato nel registry non è presente nel repository corrente | Nessuna | Non eseguibile qui |
| CRM / Supabase | Query tabelle operative | PASS connessione / NON CERTIFICATO sync | `contacts=0`, `field_visits=0`, `f1_records=0` | Nessuna | Conteggi confermati a 0 |
| Backup cloud | Query `f1_daily_backups` | FAIL | 0 backup disponibili; nessun restore reale provabile | Nessuna: non creare backup fittizi | FAIL confermato |
| Sync PC ↔ cloud ↔ smartphone | Verifica presenza dati per round-trip | NON CERTIFICATO | Nessun record disponibile nelle tabelle operative, quindi nessun round-trip reale testabile | Nessuna | NON CERTIFICATO |
| Smartphone/PWA | Manifest `start_url=./oggi.html`, service worker registrato da `pwa.js` | PASS strutturale / BLOCCATO E2E | Installazione, offline, refresh cache e UI su dispositivo reale non testabili qui | Correzione Service Worker sopra | Struttura coerente; E2E BLOCCATO |
| Funnel Engine | Ricerca nel repository canonico e registry | FAIL / NON IDENTIFICATO | Nessun modulo canonico Funnel individuato nel repository/registry corrente | Nessuna | FAIL confermato |
| Role Play | Ricerca nell'ecosistema GitHub accessibile in questa run | NON CERTIFICATO | Nessun modulo canonico Role Play identificato nel repository `launcher-dashboard`; audio/microfono richiedono dispositivo/browser reale | Nessuna | NON CERTIFICATO |
| Live HTTP esterno | Verifica diretta URL GitHub Pages dall'ambiente di esecuzione | BLOCCATO | Risoluzione DNS esterna del runtime non disponibile; usato invece lo smoke test GitHub Actions del Radar e lo stato deploy Pages | Nessuna | BLOCCATO |

## Correzione applicata

Commit: `c18eee505b946c6176caee57117ab14ff2f24292`

Problema: il Service Worker utilizzava `cache.addAll(STATIC)` includendo due file inesistenti (`incrocio-giro-contatti.html`, `market-intelligence.html`). Un singolo 404 può rigettare l'intera Promise di installazione della cache.

Correzione: rimossi esclusivamente i due asset inesistenti dalla lista di pre-cache; nessuna funzione è stata inventata o sostituita. La cache è stata versionata nuovamente per forzare l'aggiornamento.

Retest: albero repository corrente confrontato con la nuova lista `STATIC`; tutti i path rimasti risultano presenti. GitHub Pages del commit ha concluso il deploy con `success`.

## Errori / blocchi ancora aperti

1. `market-intelligence.html` è richiamato da `oggi.html` e dal registry ma non esiste nel repository canonico.
2. `incrocio-giro-contatti.html` è registrato come vista operativa ma non esiste nel repository canonico.
3. Il registry dichiara `windows_valle_susa/f1_mobile_server.py`, mentre tale sorgente non è presente nell'albero corrente: Centrale Telefonate non certificabile.
4. Backup cloud: `f1_daily_backups = 0`; restore non testabile.
5. Sync: `contacts = 0`, `field_visits = 0`, `f1_records = 0`; nessun round-trip reale.
6. Funnel Engine canonico non identificato.
7. Role Play non certificato in questa run.
8. Seller Signal V3 richiede test E2E sul PC reale con Selenium/Chrome, DB locale e output `LISTA_MATTINO.html`.
9. Il workflow Radar corrente aveva superato unit test, syntax check, smoke test Pages e scansione, ma era ancora nel secondo pass di deduplicazione quando è stato registrato questo report.

## Release gate

**FAIL/BLOCCATI presenti: release non certificata.**
