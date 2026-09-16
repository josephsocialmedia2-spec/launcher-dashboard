# F1 OS Nightly QA — 2026-09-17

Esecuzione automatica non interattiva. PASS solo per funzioni realmente verificate; BLOCCATO quando serve PC Windows, localhost, dispositivo reale, credenziali/sessione non disponibile o intervento umano.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Accesso repository canonico `josephsocialmedia2-spec/launcher-dashboard`, default branch `main`, HEAD | PASS | Nessuno | Nessuna | PASS — HEAD iniziale `cc2e83114590b6a0d767823e15da5daa50e666c6` |
| OGGI COSA FACCIO | Fetch reale `oggi.html` e dipendenze dichiarate | PASS strutturale | Runtime browser completo non eseguito | Nessuna | PASS strutturale |
| GitHub Pages build/deploy | Ultimo Pages sul HEAD iniziale | PASS | Nessuno | Nessuna | PASS — run #1145 `completed/success` |
| PWA | Manifest reale: `id/start_url=./oggi.html`, `scope=./`, standalone | PASS strutturale | Installazione/offline reale richiede browser/dispositivo | Nessuna | BLOCCATO E2E |
| CRM | Sorgenti collegate da `oggi.html`; verifica cloud dei record | PASS strutturale / NON CERTIFICATO E2E | `contacts=0`, `f1_records=0`; nessun ciclo CRUD/sync reale verificabile | Nessuna | NON CERTIFICATO E2E |
| Supabase / cloud | Stato progetto e query SQL reale | PASS connessione / FAIL dati operativi | `ACTIVE_HEALTHY`; `contacts=0`, `field_visits=0`, `f1_records=0`, `f1_daily_backups=0` | Nessuna: non creati dati artificiali | FAIL dati |
| Sicurezza cloud | Supabase Security Advisor reale | FAIL / WARN | 9 tabelle RLS senza policy; 2 funzioni search_path mutabile; `pg_net` in public; 3 SECURITY DEFINER eseguibili da anon; 15 da authenticated; leaked-password protection disabilitata | Nessuna: modifica automatica potrebbe cambiare autorizzazioni/comportamento produzione | FAIL |
| Backup cloud | Conteggio reale `f1_daily_backups` | FAIL | 0 backup registrati | Nessuna: non creato backup fittizio | FAIL |
| Restore | Ripristino reale | BLOCCATO | Nessun backup cloud disponibile e nessun PC locale raggiungibile | Nessuna | BLOCCATO |
| Radar Edilizio | Lettura reale `data/radar_scan_log.json` | FAIL / STALE | Ultima scansione 2026-09-09; 4 ConnectTimeout: Meana di Susa, Giaglione, Venaus, Bussoleno | Nessuna: nessuna nuova scansione verificata | FAIL / STALE |
| Funnel Engine | `oggi.html` espone funnel operativo, ma non è stato certificato un motore canonico separato | PASS UI / NON CERTIFICATO motore | Nessun test E2E specifico del motore separato | Nessuna | NON CERTIFICATO |
| Role Play | Verifica limitata ai componenti repository già integrati | BLOCCATO E2E | Microfono/audio/browser reale non disponibili | Nessuna | BLOCCATO |
| App smartphone | Manifest/PWA strutturali disponibili | PASS strutturale / BLOCCATO E2E | Installazione, offline, microfono, LAN e sync richiedono dispositivo reale | Nessuna | BLOCCATO |
| Windows / Microzone / Centrale | Runtime locale | BLOCCATO | PC Windows, localhost, Selenium/Chrome, SQLite e LAN non raggiungibili | Nessuna | BLOCCATO |
| Integrazioni | GitHub e Supabase interrogati realmente | PASS parziale | Componenti locali/device non raggiungibili | Nessuna | PASS GitHub/Supabase; BLOCCATO locale |

## Esito finale

**NON CERTIFICATO.** GitHub repository e Pages sul HEAD iniziale sono PASS; PWA è coerente strutturalmente. Persistono Radar Edilizio stale con 4 timeout, cloud privo di record operativi e backup, restore impossibile, e warning di sicurezza Supabase aumentati rispetto al registro precedente (RLS senza policy 7→9; SECURITY DEFINER authenticated 2→15, oltre a 3 funzioni anon). Windows/localhost/smartphone/audio restano BLOCCATI E2E. Nessuna correzione di produzione applicata perché i problemi residui richiedono dati reali, decisioni sulle autorizzazioni o accesso a PC/dispositivo.