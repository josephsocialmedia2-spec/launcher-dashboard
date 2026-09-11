# F1 OS Nightly QA — 2026-09-12

Scope: autodiagnosi accessibile da cloud/GitHub/Supabase, con entrypoint canonico `oggi.html` (OGGI COSA FACCIO). Nessun componente locale viene dichiarato funzionante senza test reale.

| Componente | Test | Esito | Errore / evidenza | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Accesso repo canonico `josephsocialmedia2-spec/launcher-dashboard` e lettura albero/file | PASS | Repository e sorgenti accessibili | Nessuna | PASS |
| OGGI COSA FACCIO | Presenza entrypoint canonico `oggi.html` e registry | PASS strutturale | `system-registry.json` dichiara `oggi.html` come `canonical_entrypoint` | Nessuna | PASS strutturale |
| Link Market Intelligence | Verifica file `market-intelligence.html` nel repository | FAIL | GitHub Contents API: 404 Not Found; il registry continua a referenziarlo | Nessuna: destinazione canonica sostitutiva non identificata | FAIL confermato |
| Link Incrocio Giro / Contatti | Verifica file `incrocio-giro-contatti.html` nel repository | FAIL | GitHub Contents API: 404 Not Found; il registry continua a referenziarlo | Nessuna: destinazione canonica sostitutiva non identificata | FAIL confermato |
| GitHub Actions | Ultime esecuzioni disponibili | PASS parziale | Esecuzioni recenti consultabili; run `F1 Gruppi Facebook Reminder` completata `success` | Nessuna | PASS per run osservata |
| GitHub Pages build/deploy | Ultima run Pages osservata | PASS | `pages build and deployment`, run 560, `completed/success`, head `48844c684d15ccdd1f38e5286422f68321731fea` | Nessuna | PASS |
| GitHub Pages live HTTP | Apertura reale endpoint pubblico da browser | BLOCCATO | Ambiente corrente non ha prodotto un test HTTP/browser live affidabile; non inferito dalla sola build | Nessuna | BLOCCATO |
| PWA manifest | Verifica `manifest.webmanifest` e start URL | PASS strutturale | `start_url` = `./oggi.html`, `display` = `standalone` | Nessuna | PASS strutturale |
| PWA install/offline smartphone | Installazione, service worker e offline su dispositivo reale | BLOCCATO | Richiede browser/dispositivo reale | Nessuna | BLOCCATO |
| Supabase / cloud | Connessione progetto e query tabelle | PASS con dati vuoti | Connessione/query riuscita | Nessuna | PASS connessione |
| CRM cloud | Conteggio `contacts` | NON CERTIFICATO | `contacts = 0`; nessun CRUD reale autenticato verificabile in questa run | Nessuna | NON CERTIFICATO |
| Field Visits | Conteggio `field_visits` | NON CERTIFICATO | `field_visits = 0`; nessun flusso reale verificato | Nessuna | NON CERTIFICATO |
| F1 records / sync | Conteggio `f1_records` | NON CERTIFICATO | `f1_records = 0`; sync PC ↔ cloud ↔ smartphone non dimostrabile | Nessuna | NON CERTIFICATO |
| Backup cloud | Conteggio `f1_daily_backups` | FAIL | `f1_daily_backups = 0`: nessun backup cloud reale disponibile da verificare/ripristinare | Nessuna | FAIL confermato |
| Supabase Security Advisor | Audit sicurezza | WARN / FAIL sicurezza | `auth_leaked_password_protection`: protezione password compromesse disabilitata. Inoltre 6 tabelle con RLS attivo e nessuna policy (`casefamiglia_admin_audit`, `casefamiglia_lead_events`, `casefamiglia_leads`, `f1_buyer_lead_events`, `f1_buyer_leads`, `f1_lead_magnets`) | Nessuna: non applicate policy/accessi alla cieca perché potrebbe cambiare la semantica autorizzativa | WARN confermato |
| Radar | Lettura ultimo `data/radar_scan_log.json` | FAIL / STALE | Ultimo scan registrato iniziato 2026-09-09 12:22 UTC, scanner v4; 4 errori ConnectTimeout (Meana di Susa, Giaglione, Venaus, Bussoleno), `new_records=0`; nessun log più recente nel file verificato | Nessuna modifica automatica a fonti/timeout senza una scansione controllata | FAIL confermato |
| Funnel Engine | Individuazione modulo canonico verificabile | NON IDENTIFICATO | Ricerca repository per `role-play/roleplay/funnel-engine/funnel_engine/funnel` senza modulo canonico identificato | Nessuna | NON IDENTIFICATO |
| Role Play | Individuazione modulo canonico verificabile | NON IDENTIFICATO | Nessun modulo canonico trovato dalla ricerca repository eseguita | Nessuna | NON IDENTIFICATO |
| Centrale Telefonate | Verifica dipendenza runtime | BLOCCATO | Registry: `http://127.0.0.1:8766/` su PC e `http://f1-radar.local:8766/` su mobile; servizio locale non raggiungibile da questa run | Nessuna | BLOCCATO |
| Server locale mobile | Presenza/uso runtime `windows_valle_susa/f1_mobile_server.py`, porta 8766 | BLOCCATO E2E | Richiede Windows reale e processo in esecuzione | Nessuna | BLOCCATO |
| App smartphone | Test installazione, navigazione, rete locale e sync | BLOCCATO E2E | Richiede smartphone/browser/rete locale reali | Nessuna | BLOCCATO |
| Backup locale / restore | Creazione e ripristino DB locale | BLOCCATO | Richiede filesystem/SQLite del PC Windows reale | Nessuna | BLOCCATO |

## Esito

**RELEASE NON CERTIFICATA.** Errori non risolti: due destinazioni HTML referenziate ma mancanti, backup cloud assente, Radar con ultimo log obsoleto e 4 timeout, warning sicurezza Supabase. Test Windows/localhost, smartphone, CRUD autenticato, sync e restore restano BLOCCATI/NON CERTIFICATI.

Nessuna correzione potenzialmente distruttiva o basata su supposizioni è stata applicata. Le correzioni che richiedono definizione del modulo canonico o policy di autorizzazione sono state lasciate in stato esplicito anziché inventate.