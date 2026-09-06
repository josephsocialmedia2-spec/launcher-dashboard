# F1 OS — Nightly QA — 2026-09-07

## Stato finale

**RELEASE NON CERTIFICATA / BLOCCATA per le funzioni locali Windows e per la prova end-to-end di sync/backup.**

Regola applicata: nessuna funzione viene dichiarata PASS se non è stata realmente verificata nell'ambiente accessibile.

| Componente | Test | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| OGGI COSA FACCIO | Verifica entrypoint canonico e dipendenze PWA nel repository `launcher-dashboard` | PASS strutturale | Test browser pubblico live non eseguibile da questo ambiente | Nessuna | Sorgenti rilette |
| GitHub Pages launcher-dashboard | Ultimo build/deploy Actions | PASS | — | Nessuna | Run Pages conclusa `success` sul commit corrente verificato |
| GitHub Pages immobili-in-zona | Ultimo build/deploy Actions | PASS | — | Nessuna | Run Pages conclusa `success` sul commit corrente verificato |
| PWA / smartphone | Manifest + registrazione service worker presenti nell'entrypoint canonico | PASS strutturale / BLOCCATO E2E | Installazione reale, offline e dispositivo non disponibili | Nessuna | Non eseguibile qui |
| Centrale Telefonate | Verifica riferimenti a server locale e presenza sorgenti Windows nel repository | BLOCCATO | `127.0.0.1:8766` e `f1-radar.local:8766` richiedono PC reale | Nessuna | Non eseguibile qui |
| Seller Signal → vie vicine → contatti pubblici | Verifica implementazione sorgente V1/V2/V3 + installer | PASS strutturale / BLOCCATO E2E | Selenium/Chrome, task Windows 04:30, DB locale e output `LISTA_MATTINO.html` non raggiungibili | Nessuna | CI attuale verifica sintassi/installer, non ricerca Internet reale |
| CRM / cloud | Connessione Supabase e schema | PASS connessione / NON CERTIFICATO sync | Tabelle operative senza record disponibili al test | Nessuna | Query ripetuta |
| Backup cloud | Verifica `f1_daily_backups` | FAIL | 0 record di backup disponibili | Nessuna: non viene creato un backup fittizio | FAIL confermato |
| F1 records cloud | Verifica `f1_records` | NON CERTIFICATO | 0 record, quindi impossibile provare round-trip PC↔cloud↔smartphone | Nessuna | 0 record confermati |
| Sicurezza Supabase | Security Advisor | PASS | Nessun warning restituito | Nessuna | PASS |
| Seller Radar / dati | Presenza dataset e snapshot correnti nel repository `immobili-in-zona` | PASS strutturale | Nessun test browser live | Nessuna | Repository corrente verificato |
| Role Play | Presenza applicazione/asset pubblicati nel repository Open Social | PASS strutturale / BLOCCATO E2E | Audio, microfono, voce e UI su dispositivo non testabili qui | Nessuna | Non eseguibile qui |
| Funnel Engine | Ricerca modulo canonico nel repository `launcher-dashboard` | FAIL / NON IDENTIFICATO | Nessun modulo `funnel` individuato nel repository canonico con la ricerca disponibile; impossibile eseguire test funzionale | Nessuna | Ricerca ripetuta senza risultati |
| Live HTTP Pages | Apertura reale delle URL pubbliche | BLOCCATO | L'ambiente di esecuzione non consente il test HTTP pubblico affidabile di GitHub Pages | Nessuna | Non certificato |

## Nota critica Seller Signal

Il requisito **Seller Signal → via centrale → fino a 4 vie vicine → ricerca di contatti pubblici Internet → lista mattino** risulta implementato nelle sorgenti Windows del progetto. Il motore base interroga profili pubblici PagineBianche/PagineGialle usando Google/Bing/DuckDuckGo, salva i numeri soltanto nel DB locale e non aggira CAPTCHA. V2/V3 aggregano via centrale e vie vicine e l'installer distribuisce V3 con esecuzione pianificata alle 04:30.

Questo non equivale a un PASS end-to-end: l'attuale workflow QA del bridge verifica compilazione Python e installer V3, ma non avvia Selenium/Chrome né dimostra che il PC abbia prodotto oggi contatti reali in `LISTA_MATTINO.html`.

## Blocchi da mantenere aperti

1. Health-check reale della Centrale Telefonate su Windows, inclusa porta 8766 e riavvio.
2. Esecuzione reale del motore Microzone V3 su Windows e verifica di un Seller Signal fino ai contatti pubblici trovati.
3. Backup cloud: `f1_daily_backups` deve contenere un backup reale e deve essere provato un restore.
4. Sync: eseguire almeno un round-trip reale PC → cloud → smartphone → PC.
5. Identificare il Funnel Engine canonico e sottoporlo a test funzionali e casi limite.
6. Role Play: test browser/device con audio e controlli reali.

## Release gate

**FAIL/BLOCCATI presenti: release non certificata.**
