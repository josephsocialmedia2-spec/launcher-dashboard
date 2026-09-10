# F1 OS Nightly QA — 2026-09-11

| Componente | Test | Esito | Errore | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Repository `launcher-dashboard` raggiungibile, branch `main`, Pages abilitato | PASS | — | — | PASS |
| Build / GitHub Pages | Ultima run `pages build and deployment` visibile: completed / success | PASS | — | — | PASS |
| OGGI COSA FACCIO | `oggi.html` presente e leggibile; entrypoint carica manifest e `pwa.js` | PASS strutturale | — | — | PASS |
| Link DATI MERCATO | Target `market-intelligence.html` referenziato da `oggi.html`; file cercato via GitHub contents | FAIL | 404 Not Found: file assente | Nessuna: destinazione corretta non identificabile senza inventarla | FAIL |
| Registry / Incrocio giro-contatti | `incrocio-giro-contatti.html` cercato via GitHub contents | FAIL | 404 Not Found: file assente | Nessuna: modulo canonico non identificato | FAIL |
| PWA manifest | `manifest.webmanifest` presente, `start_url=./oggi.html`, scope `./`, standalone | PASS strutturale | — | — | PASS |
| PWA bootstrap | `pwa.js` registra `./sw.js`; aggiunge Demand Match e Radar Edilizio su `oggi.html` | PASS strutturale | — | — | PASS |
| Service Worker | `sw.js` presente; precache non include i due file mancanti; cache versionata | PASS strutturale | — | — | PASS |
| CRM | `crm.html` presente nel repository e incluso nella precache SW | PASS strutturale | Test CRUD browser autenticato non eseguito in questo runtime | — | BLOCCATO E2E |
| Radar | `seller-radar-unico.html` e `seller-segnalati.html` risultano referenziati da `oggi.html`/SW | PASS strutturale | Scan/browser E2E non eseguito in questo runtime | — | BLOCCATO E2E |
| Centrale Telefonate | `oggi.html` punta a `http://127.0.0.1:8766/` | BLOCCATO | localhost del PC Windows non raggiungibile dal runtime cloud | Nessuna | BLOCCATO |
| Smartphone / PWA install | Manifest/PWA presenti | BLOCCATO E2E | installazione, offline e dispositivo reale non disponibili | Nessuna | BLOCCATO |
| Supabase progetto | Progetto `nqnmlsmeiynxbdojeyjt` status `ACTIVE_HEALTHY` | PASS | — | — | PASS |
| Supabase dati | Conteggio tabelle `contacts`, `field_visits`, `f1_records`, `f1_daily_backups` | FAIL operativo | tutte e quattro le tabelle contengono 0 record | Nessuna: non creare dati fittizi | FAIL |
| Backup cloud | `f1_daily_backups` | FAIL | 0 backup registrati | Nessuna: non creare backup fittizi | FAIL |
| Sync PC↔cloud↔smartphone | dati reali necessari per prova di round-trip | BLOCCATO / NON CERTIFICATO | 0 record e nessun PC/device reale disponibile | Nessuna | BLOCCATO |
| Funnel Engine | ricerca del termine/modulo canonico nel repository | NON IDENTIFICATO | nessun risultato canonico verificabile | Nessuna: evitare associazioni arbitrarie | NON CERTIFICATO |
| Role Play | ricerca del termine/modulo canonico nel repository | NON IDENTIFICATO | nessun risultato canonico verificabile | Nessuna | NON CERTIFICATO |
| Integrazione Google Calendar | link esterno presente in `oggi.html` | PASS strutturale | sessione/account non testabile in modo sicuro da questo runtime | — | BLOCCATO E2E |

## Stato finale

RELEASE NON CERTIFICATA.

Errori non risolti: `market-intelligence.html` assente; `incrocio-giro-contatti.html` assente; backup cloud assente; database operativo ma senza record reali per certificare sincronizzazione; Funnel Engine e Role Play canonici non identificati. Restano BLOCCATI i test dipendenti da PC Windows/localhost, browser autenticato e smartphone reale.

Nessun PASS è stato assegnato a funzioni non realmente osservate almeno a livello strutturale o di servizio raggiungibile.