# F1 OS Nightly QA — 2026-09-09

Stato release: **BLOCCATA / NON CERTIFICATA**

| Componente | Test eseguito | Esito | Errore / blocco | Correzione applicata | Retest |
|---|---|---|---|---|---|
| OGGI COSA FACCIO | Verificato `README.md` e `oggi.html`: entrypoint canonico `oggi.html`; caricamento manifest/PWA e collegamenti operativi presenti | PASS strutturale | Nessuno sul file principale | Nessuna | PASS strutturale |
| GitHub repository | Repository `launcher-dashboard` accessibile; branch `main` leggibile; ultimo albero SHA `a208a6afdee1f52cdbaedc323483f1e7c77a094f` | PASS | — | — | PASS |
| GitHub Pages/build | Run Pages recente n. 511 sul commit `a208a6a...` conclusa `success` | PASS build | Test browser reale non eseguito | — | PASS build, E2E non certificato |
| PWA manifest | `manifest.webmanifest` presente, start URL `./oggi.html`, scope `./`, display standalone | PASS strutturale | Installazione reale su smartphone non eseguita | — | PASS strutturale |
| PWA bootstrap | `pwa.js` registra `./sw.js`; aggiunge Demand Engine e Radar Edilizio in `oggi.html` | PASS strutturale | Browser/runtime reale non eseguito | — | PASS strutturale |
| Service Worker | `sw.js` presente; cache `f1-operativo-v20260908-pwa-cache-fix`; lista STATIC non contiene più `market-intelligence.html` né `incrocio-giro-contatti.html` | PASS strutturale | Offline/installazione reale non eseguita | Correzione del giorno precedente confermata presente | PASS strutturale |
| Market Intelligence | `oggi.html` e `system-registry.json` puntano a `market-intelligence.html`; `fetch_file` restituisce 404 | **FAIL** | Pagina inesistente | Nessuna: destinazione canonica non identificata, non inventata | FAIL |
| Incrocio Giro / Contatti | `system-registry.json` registra `incrocio-giro-contatti.html`; `fetch_file` restituisce 404 | **FAIL** | Componente registrato ma file assente | Nessuna: funzione non sostituibile in sicurezza senza sorgente canonica | FAIL |
| Centrale Telefonate | `oggi.html` punta a `http://127.0.0.1:8766/`; registry dichiara anche `http://f1-radar.local:8766/` | **BLOCCATO** | Richiede PC Windows/rete locale e porta 8766 | Nessuna | BLOCCATO |
| CRM | `crm.html` presente nel repository ed è richiamato da `oggi.html` e Service Worker | PASS strutturale | CRUD/browser/database reale non eseguito in questa run | — | PASS strutturale |
| Seller Radar | `oggi.html` legge `seller_radar_auto/data/giro_acquisizione.csv` dal repo `immobili-in-zona` e applica perimetro/ordinamento | PASS strutturale | Fetch dati live/browser non certificato in questa run | — | PASS strutturale |
| Radar Edilizio | `pwa.js` integra `radar-edilizio.html`; workflow dedicato presente nel repository | PASS strutturale | Run E2E corrente non certificata in questa run | — | PASS strutturale |
| Directory / Seller Signal microzone | Workflow `f1-microzone-directory-qa.yml` e pagina `directory-radar-mobile.html` presenti | PASS strutturale | Selenium/Chrome/output `LISTA_MATTINO.html` sul PC non raggiungibile | — | BLOCCATO E2E |
| Funnel Engine | Nessun modulo canonico Funnel identificato nell'entrypoint/registry verificato | **FAIL / NON IDENTIFICATO** | Componente richiesto ma non localizzato come modulo canonico verificabile | Nessuna | FAIL |
| Role Play | Nessun componente Role Play canonico individuato nei file/registry verificati di `launcher-dashboard` | **FAIL / NON IDENTIFICATO** | Modulo non localizzato nell'ecosistema canonico verificato | Nessuna | FAIL |
| App smartphone | PWA strutturalmente presente e manifest valido | **BLOCCATO E2E** | Installazione, audio/microfono, apertura Home e sync richiedono dispositivo reale | Nessuna | BLOCCATO |
| Database/cloud | `setup-cloud.html` e moduli Supabase sono referenziati dal sistema/PWA | **NON CERTIFICATO** | Nessun test autenticato Supabase/CRUD eseguito in questa run; credenziali/sessione non esposte al QA | Nessuna | NON CERTIFICATO |
| Backup/restore | Nessun test reale di backup+restore su database PC/cloud eseguito in questa run | **BLOCCATO / FAIL DI CERTIFICAZIONE** | Richiede database reale e ambiente Windows/cloud autenticato | Nessuna | BLOCCATO |
| Integrazioni esterne | Google Calendar e RPO sono collegati da `oggi.html` | PASS collegamento strutturale | Login/azione reale non testati | — | NON CERTIFICATO E2E |

## Regressioni / errori non risolti

1. `market-intelligence.html` resta referenziato ma inesistente.
2. `incrocio-giro-contatti.html` resta registrato ma inesistente.
3. Funnel Engine non è identificato come modulo canonico verificabile.
4. Role Play non è identificato come modulo canonico verificabile.
5. Centrale Telefonate, Seller Signal E2E, smartphone e backup/restore richiedono accesso al PC/dispositivo/servizi autenticati e restano BLOCCATI.
6. Database/cloud non è dichiarato funzionante perché non è stato eseguito un CRUD autenticato reale in questa run.

## Regola di release

Release non consentita finché esistono FAIL critici o componenti obbligatori non certificati. Nessuna correzione è stata inventata per componenti mancanti o ambienti non accessibili.
