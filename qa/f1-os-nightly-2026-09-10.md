# F1 OS — Nightly QA — 2026-09-10

Stato complessivo: **BLOCCATO / NON CERTIFICATO**

Regola QA applicata: PASS solo per test realmente eseguiti o per stato CI/API verificato durante questa sessione. BLOCCATO quando servono PC Windows, localhost, browser/dispositivo reale o credenziali/sessione non disponibili. Nessuna funzione non testata viene dichiarata funzionante.

| Data | Componente | Test | Esito | Errore / evidenza | Correzione applicata | Retest |
|---|---|---|---|---|---|---|
| 2026-09-10 | Repository GitHub | Albero `main`, entrypoint e componenti canonici | PASS | `main` risponde; HEAD `b643432a64a51191b2f1150a58933ccc07b2f7d8`; `oggi.html`, CRM, Radar, PWA, bridge e QA presenti | Nessuna | PASS |
| 2026-09-10 | GitHub Pages build | Ultima build/deploy associata a HEAD | PASS | Run Pages #525: `completed/success` su HEAD `b643432...` | Nessuna | PASS |
| 2026-09-10 | OGGI COSA FACCIO | Analisi sorgente e link relativi | FAIL | Il pulsante `DATI MERCATO` punta ancora a `market-intelligence.html`, file non presente nell'albero GitHub | Nessuna: destinazione corretta non identificata con certezza | FAIL |
| 2026-09-10 | System Registry | Coerenza path dichiarati vs albero repository | FAIL | Registry dichiara `incrocio-giro-contatti.html`, `market-intelligence.html` e `windows_valle_susa/f1_mobile_server.py`; nessuno dei tre path è presente nel repository corrente | Nessuna: evitare sostituzioni inventate | FAIL |
| 2026-09-10 | PWA manifest | `start_url`, scope, display | PASS strutturale | `start_url=./oggi.html`, `scope=./`, `display=standalone` verificati nel manifest | Nessuna | PASS |
| 2026-09-10 | Service Worker | Lista precache vs file presenti | PASS strutturale | La lista STATIC attuale contiene solo asset presenti nell'albero verificato; i due file mancanti non sono più in precache | Nessuna | PASS |
| 2026-09-10 | GitHub Pages/PWA runtime | Apertura HTTP reale, installazione, cache offline | BLOCCATO | L'ambiente QA non può risolvere `josephsocialmedia2-spec.github.io`; nessun browser/dispositivo reale disponibile | Nessuna | BLOCCATO |
| 2026-09-10 | Database / Supabase | Esistenza tabelle e RLS | PASS | `contacts`, `field_visits`, `f1_records`, `f1_daily_backups` esistono e hanno RLS attivo | Nessuna | PASS |
| 2026-09-10 | Database / dati reali | Conteggio record | FAIL / NON CERTIFICABILE | `contacts=0`, `field_visits=0`, `f1_records=0`, `f1_daily_backups=0`: non esistono dati reali con cui certificare sincronizzazione o backup | Nessuna; non creati dati fittizi | FAIL |
| 2026-09-10 | CRM | Sorgente `crm.html` presente e configurazione cloud disponibile | PASS strutturale | File presente; configurazione Supabase punta a `contacts` e `field_visits` | Nessuna | PASS strutturale |
| 2026-09-10 | CRM cloud E2E | CRUD autenticato reale | BLOCCATO | Nessun record e nessuna sessione utente reale usabile per test di scrittura/lettura end-to-end | Nessuna | BLOCCATO |
| 2026-09-10 | Radar edilizio | Ultimo scan registrato | FAIL parziale | Scan 2026-09-09 12:22–12:24 UTC: 4 fonti in ERROR per timeout (Meana di Susa, Giaglione, Venaus, Bussoleno); altre fonti OK | Nessuna: errori rete remoti, non patchare sorgenti senza evidenza di URL alternativi stabili | FAIL |
| 2026-09-10 | Seller Signal / microzone | Presenza motore Windows V3 e installer | PASS strutturale | `windows-bridge/f1_microzone_directory_v3.py` e `INSTALLA_MOTORE_MICROZONA.bat` presenti | Nessuna | PASS strutturale |
| 2026-09-10 | Seller Signal / contatti pubblici E2E | Esecuzione Selenium/Chrome, produzione lista mattino | BLOCCATO | Richiede PC Windows, Chrome/Selenium, DB locale e rete del PC | Nessuna | BLOCCATO |
| 2026-09-10 | Centrale Telefonate | Dipendenze runtime | BLOCCATO | `oggi.html` usa `http://127.0.0.1:8766/`; registry usa anche `http://f1-radar.local:8766/`; server canonico dichiarato nel registry non è presente nel repo | Nessuna | BLOCCATO |
| 2026-09-10 | App smartphone | Sorgenti mobile/PWA presenti | PASS strutturale | `f1-os-mobile.html`, `oggi.html`, manifest, SW e `directory-radar-mobile.html` presenti | Nessuna | PASS strutturale |
| 2026-09-10 | App smartphone E2E | Installazione, rete locale, sync, uso touch/offline | BLOCCATO | Richiede smartphone/browser reale e servizio PC locale | Nessuna | BLOCCATO |
| 2026-09-10 | Role Play | Individuazione modulo canonico e test audio/voce | FAIL / NON IDENTIFICATO | Nessun modulo Role Play canonico identificato nell'albero `launcher-dashboard`; non possibile eseguire voce/audio/statistiche | Nessuna | FAIL |
| 2026-09-10 | Funnel Engine F1 | Individuazione modulo canonico e test formule | FAIL / NON IDENTIFICATO | Nessun Funnel Engine F1 canonico identificato nel repository verificato. I nuovi funnel `casefamiglia-growth-system` sono un progetto separato e non vengono assunti come Funnel Engine F1 | Nessuna | FAIL |
| 2026-09-10 | Backup cloud | Presenza backup reali | FAIL | `f1_daily_backups=0` | Nessuna; non creato backup fittizio | FAIL |
| 2026-09-10 | Backup/restore PC | Backup SQLite + ripristino reale | BLOCCATO | Richiede accesso all'installazione Windows e al database locale | Nessuna | BLOCCATO |
| 2026-09-10 | Integrazioni disponibili | Google Calendar link, Supabase config, RPO link, Pages references | PASS strutturale | Link/configurazioni presenti in sorgente; non implica login o funzionamento E2E | Nessuna | PASS strutturale |
| 2026-09-10 | Regressione modulo PWA | Verifica asset precache dopo fix 08/09 | PASS strutturale | Nessun riferimento ai due file mancanti nella lista STATIC del service worker | Nessuna | PASS |

## Errori non risolti / regressioni

1. `market-intelligence.html` è ancora referenziato da `oggi.html` e dal registry ma non esiste nel repository.
2. `incrocio-giro-contatti.html` è ancora dichiarato nel registry ma non esiste nel repository.
3. Il registry dichiara `windows_valle_susa/f1_mobile_server.py`, ma il path non esiste nel repository corrente; la Centrale dipende comunque dalla porta locale 8766.
4. Radar edilizio: ultimo scan disponibile registra 4 sorgenti in timeout.
5. Cloud senza dati reali: `contacts`, `field_visits`, `f1_records` e `f1_daily_backups` sono tutti a zero; sync e backup non sono certificabili.
6. Role Play F1 canonico non identificato nel repository verificato.
7. Funnel Engine F1 canonico non identificato nel repository verificato.
8. Test E2E Windows, localhost, smartphone, browser PWA/offline e restore rimangono BLOCCATI.

## Correzioni automatiche

Nessuna correzione applicata in questa sessione: i problemi identificati richiedono una destinazione canonica non ambigua o accesso runtime locale. Modificare i riferimenti senza sapere il target corretto violerebbe la regola di non inventare correzioni.

## Esito finale

**BLOCCATO / NON CERTIFICATO.** Build GitHub Pages e struttura PWA/cloud di base superano i controlli accessibili, ma restano errori di registry/link, Radar con fonti in timeout, dati cloud/backup vuoti e moduli/runtime non certificabili.