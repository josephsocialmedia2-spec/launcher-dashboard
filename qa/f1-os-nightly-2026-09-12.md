# F1 OS Nightly QA — 2026-09-12

Scope: autodiagnosi accessibile da cloud/GitHub/Supabase, con entrypoint canonico `oggi.html` (OGGI COSA FACCIO). Nessun componente locale viene dichiarato funzionante senza test reale.

| Componente | Test | Esito | Errore / evidenza | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | Accesso repo canonico `josephsocialmedia2-spec/launcher-dashboard`, albero ricorsivo e file chiave | PASS | Repository leggibile; `oggi.html`, `crm.html`, manifest e registry recuperati | Nessuna | PASS |
| OGGI COSA FACCIO | Presenza entrypoint canonico `oggi.html` e coerenza registry | PASS strutturale | `system-registry.json` dichiara `oggi.html` come `canonical_entrypoint`; pagina sorgente disponibile | Nessuna | PASS strutturale |
| Link Market Intelligence | Verifica `market-intelligence.html` nel repository | FAIL | GitHub Contents API: 404 Not Found; `oggi.html` e registry continuano a referenziarlo | Nessuna: destinazione canonica sostitutiva non identificata | FAIL confermato |
| Link Incrocio Giro / Contatti | Verifica `incrocio-giro-contatti.html` nel repository | FAIL | Registry continua a referenziarlo; file assente dall'albero canonico | Nessuna: destinazione canonica sostitutiva non identificata | FAIL confermato |
| Server locale registrato | Verifica `windows_valle_susa/f1_mobile_server.py` | FAIL strutturale / BLOCCATO runtime | Registry lo dichiara su porta 8766, ma il file non è presente nel repository canonico; esecuzione reale richiede Windows | Nessuna | FAIL file / BLOCCATO E2E |
| GitHub Pages build/deploy | Ultima run Pages disponibile dopo il QA | PASS | `pages build and deployment`, run 561, `completed/success`, head `ce386e8a4f7e41ecc920ef9760855c1eacd3f1b7` | Nessuna | PASS |
| GitHub Pages live HTTP | Apertura reale degli endpoint pubblici da runtime | BLOCCATO | Tentativo HTTP effettuato, ma il runtime non risolve il dominio `josephsocialmedia2-spec.github.io`; non inferito dalla sola build | Nessuna | BLOCCATO |
| PWA manifest | Verifica `manifest.webmanifest` | PASS strutturale | `start_url` = `./oggi.html`, `scope` = `./`, `display` = `standalone` | Nessuna | PASS strutturale |
| PWA install/offline smartphone | Installazione, service worker e offline su dispositivo reale | BLOCCATO | Richiede browser/dispositivo reale | Nessuna | BLOCCATO |
| Supabase progetto | Stato progetto e query DB | PASS connessione | Progetto `nqnmlsmeiynxbdojeyjt` = `ACTIVE_HEALTHY`; query SQL riuscite | Nessuna | PASS connessione |
| CRM sorgente | Presenza UI CRUD/offline-first e sync hook | PASS strutturale | `crm.html` contiene create/edit/delete locale, export/import backup e chiamate `F1Sync`; nessuna sessione browser reale eseguita | Nessuna | PASS strutturale / E2E non certificato |
| CRM cloud | Conteggio `contacts` | NON CERTIFICATO | `contacts = 0`; nessun CRUD reale autenticato verificabile in questa run | Nessuna | NON CERTIFICATO |
| Field Visits | Conteggio `field_visits` | NON CERTIFICATO | `field_visits = 0`; nessun flusso reale verificato | Nessuna | NON CERTIFICATO |
| F1 records / sync | Conteggio `f1_records` | NON CERTIFICATO | `f1_records = 0`; sync PC ↔ cloud ↔ smartphone non dimostrabile | Nessuna | NON CERTIFICATO |
| Backup cloud | Conteggio `f1_daily_backups` | FAIL | `f1_daily_backups = 0`: nessun backup cloud reale disponibile da verificare/ripristinare | Nessuna | FAIL confermato |
| Backup locale / restore | Verifica sorgente CRM e restore reale | BLOCCATO E2E | `crm.html` espone export JSON e import JSON; creazione/ripristino su dataset reale non eseguiti; filesystem Windows non accessibile | Nessuna | BLOCCATO |
| Supabase Security Advisor | Audit sicurezza | WARN / FAIL sicurezza | `auth_leaked_password_protection` ancora disabilitato; 6 tabelle con RLS attivo e nessuna policy: `casefamiglia_admin_audit`, `casefamiglia_lead_events`, `casefamiglia_leads`, `f1_buyer_lead_events`, `f1_buyer_leads`, `f1_lead_magnets` | Nessuna: non applicate policy/accessi alla cieca perché cambierebbero la semantica autorizzativa | WARN confermato |
| Radar | Lettura `data/radar_scan_log.json` | FAIL / STALE | Ultimo scan iniziato 2026-09-09 12:22 UTC, scanner v4; 4 `ConnectTimeout` (Meana di Susa, Giaglione, Venaus, Bussoleno), `new_records=0`; nessun log più recente nel file verificato | Nessuna modifica automatica a fonti/timeout senza scansione controllata | FAIL confermato |
| Seller Radar / Giro | Presenza sorgenti collegate da `oggi.html` | PASS strutturale | `oggi.html` collega `seller-radar-unico.html`, `seller-segnalati.html`, `giro-acquisizione.html` e CSV remoto del Radar | Nessuna | PASS strutturale; E2E live non certificato |
| Funnel Engine | Individuazione modulo canonico verificabile nell'albero repository | NON IDENTIFICATO | Nessun path canonico `funnel` / `funnel-engine` individuato nell'albero verificato | Nessuna | NON IDENTIFICATO |
| Role Play | Individuazione modulo canonico verificabile nell'albero repository | NON IDENTIFICATO | Nessun path canonico `roleplay` / `role-play` individuato nell'albero verificato | Nessuna | NON IDENTIFICATO |
| Centrale Telefonate | Dipendenze runtime | BLOCCATO | Registry e `oggi.html`: `http://127.0.0.1:8766/` su PC e `http://f1-radar.local:8766/` su mobile; servizio locale non raggiungibile da questa run | Nessuna | BLOCCATO |
| App smartphone | Installazione, navigazione, rete locale e sync | BLOCCATO E2E | Richiede smartphone/browser/rete locale reali | Nessuna | BLOCCATO |
| Integrazioni esterne | Calendar / RPO / immobili-in-zona referenziati dall'entrypoint | NON CERTIFICATO E2E | Link presenti nelle sorgenti; apertura live non certificata dal runtime attuale | Nessuna | NON CERTIFICATO |

## Esito

**RELEASE NON CERTIFICATA.** Errori non risolti: `market-intelligence.html` mancante, `incrocio-giro-contatti.html` mancante, `windows_valle_susa/f1_mobile_server.py` assente dal repository canonico, backup cloud assente, Radar con log obsoleto e 4 timeout, warning sicurezza Supabase.

Test Windows/localhost, smartphone, CRUD autenticato, sync, installazione/offline PWA e restore reale restano BLOCCATI/NON CERTIFICATI. Funnel Engine e Role Play non sono stati identificati come moduli canonici nell'albero verificato.

Nessuna correzione potenzialmente distruttiva o basata su supposizioni è stata applicata. La build Pages successiva al registro è PASS.