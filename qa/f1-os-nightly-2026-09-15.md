# F1 OS Nightly QA — 2026-09-15

Esecuzione automatica non interattiva. PASS solo per funzioni realmente verificate; BLOCCATO quando serve PC Windows, localhost, dispositivo reale, credenziali/sessione non disponibile o intervento umano.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Accesso repository, albero `main`, HEAD | PASS | Nessuno | Nessuna | PASS — HEAD iniziale `f73f251e19a5784e86c085b0dca19bf27f5ce60b` |
| OGGI COSA FACCIO | Presenza `oggi.html` nell'albero canonico | PASS strutturale | Runtime browser non eseguito | Nessuna | PASS strutturale |
| GitHub Pages build/deploy | Run Pages #996 sul medesimo HEAD; job build/report/deploy | PASS | Nessuno | Nessuna | PASS — tutti e 3 i job `success` |
| GitHub Pages live | Apertura HTTP reale di `oggi.html`/manifest/sw | BLOCCATO | L'ambiente web di questa run non ha accettato l'URL Pages e la ricerca non ha restituito una pagina navigabile; non trasformato in PASS | Nessuna | BLOCCATO |
| PWA | Presenza `manifest.webmanifest`, `pwa.js`, `sw.js` | PASS strutturale | Installazione/offline reale richiede browser/dispositivo | Nessuna | PASS strutturale / BLOCCATO E2E |
| Suite QA repository | Ultimo `qa-results-main/summary.json` disponibile | PASS storico / STALE | Report generato 2026-08-27: 83 passed, 0 failed, 1 skipped; non è una run odierna | Nessuna | NON CERTIFICATO come regressione odierna |
| CRM | Sorgenti CRM e test dedicati presenti (`crm.html`, `f1-crm-os.*`, `tests/crm-full-e2e.spec.js`, ecc.) | PASS strutturale / NON CERTIFICATO E2E | Cloud operativo senza record reali | Nessuna | NON CERTIFICATO E2E |
| Supabase / cloud | Stato progetto + query SQL reale | PASS connessione / FAIL dati operativi | Progetto ACTIVE_HEALTHY; `contacts=0`, `field_visits=0`, `f1_records=0`, `f1_daily_backups=0` | Nessuna: non creati dati artificiali | FAIL dati invariato |
| Sicurezza cloud | Supabase Security Advisor reale | FAIL / WARN | 7 tabelle con RLS senza policy; 2 funzioni con search_path mutabile; `pg_net` in `public`; 2 SECURITY DEFINER eseguibili da authenticated; leaked-password protection disabilitata | Nessuna: modifiche a policy/funzioni/auth possono cambiare comportamento produzione e richiedono revisione intenzionale | FAIL invariato |
| Backup cloud | Conteggio `f1_daily_backups` | FAIL | 0 backup registrati | Nessuna: non creato backup fittizio | FAIL |
| Restore | Ripristino reale | BLOCCATO | Nessun backup cloud disponibile e nessun PC locale raggiungibile | Nessuna | BLOCCATO |
| Radar Edilizio | Lettura log reale `data/radar_scan_log.json` | FAIL / STALE | Ultima scansione 2026-09-09; 4 ConnectTimeout: Meana di Susa, Giaglione, Venaus, Bussoleno | Nessuna correzione automatica: endpoint esterni e nessuna nuova scansione verificata | FAIL / STALE |
| Seller Radar | Presenza moduli seller e dati | PASS strutturale | Raccolta/browser reale non eseguiti | Nessuna | PASS strutturale |
| Microzone / Directory Radar | Motori Windows V1/V2/V3, installer e Directory Radar presenti | PASS strutturale / BLOCCATO E2E | Selenium/Chrome/SQLite/output e processi Windows richiedono PC reale | Nessuna | BLOCCATO E2E |
| Centrale Telefonate / bridge | Sorgenti bridge Windows presenti | PASS strutturale / BLOCCATO E2E | Processo/porta localhost e LAN non raggiungibili | Nessuna | BLOCCATO E2E |
| Role Play | `roleplay-partners.js`, `roleplay-realistic.js` e `tests/roleplay-partners.spec.js` presenti | PASS strutturale / BLOCCATO audio E2E | Microfono/audio/browser reale non disponibili | Nessuna | BLOCCATO E2E |
| App smartphone | `f1-os-mobile.html`, `directory-radar-mobile.html`, `gestione-app.html` e test mobile presenti | PASS strutturale / BLOCCATO E2E | Installazione PWA, offline, microfono, LAN e sync richiedono dispositivo reale | Nessuna | BLOCCATO E2E |
| Funnel Engine | Ricerca nell'albero canonico | FAIL / NON IDENTIFICATO | Nessun modulo esplicitamente canonico `Funnel Engine` identificato; non assimilati moduli non equivalenti | Nessuna | FAIL |
| Integrazioni | GitHub + Supabase realmente interrogati | PASS parziale | Windows/local network/browser-device non raggiungibili | Nessuna | PASS GitHub/Supabase; BLOCCATO locale |

## Esito finale

**NON CERTIFICATO.** GitHub repository e Pages build/deploy risultano PASS sul HEAD verificato; Role Play e smartphone risultano ora chiaramente presenti a livello sorgente/test e non sono più classificati come moduli inesistenti. Restano aperti: Radar Edilizio fermo al 9 settembre con 4 timeout, cloud senza record operativi e senza backup, Security Advisor con warning da revisionare, restore impossibile senza backup, Funnel Engine canonico non identificato, e tutti i test Windows/localhost/smartphone/audio E2E.

Nessuna correzione di produzione è stata applicata: gli errori residui richiedono dati reali, decisioni di sicurezza o accesso a PC/dispositivo e non sono correggibili automaticamente senza rischio o senza falsare il QA.
