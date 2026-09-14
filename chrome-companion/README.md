# F1 Chrome Companion

Runtime locale Chrome del motore **★ MI INTERESSA → Google Dork → dossier**.

## Funzione

Il Companion non usa API di ricerca esterne. Legge dalla coda Supabase `research_jobs`, apre una sola ricerca Google alla volta in una scheda non attiva, salva subito i risultati pubblici, visita in modo sequenziale solo le fonti ritenute pertinenti, consolida i riferimenti pubblici e aggiorna il dossier nel CRM F1.

Il CRM continua a funzionare normalmente durante la ricerca. Lo stato del job è persistente su Supabase e il Companion può riprendere dopo una chiusura di Chrome.

## Installazione una tantum

1. Scaricare/clonare la cartella `chrome-companion` sul PC operativo.
2. Aprire `chrome://extensions`.
3. Attivare **Modalità sviluppatore**.
4. Scegliere **Carica estensione non pacchettizzata** e selezionare la cartella `chrome-companion`.
5. Aprire il CRM F1 ed effettuare l'accesso cloud. La sessione autenticata viene sincronizzata localmente con il Companion; non vengono memorizzate password.

## Sicurezza operativa

- Ricerche sequenziali e distanziate; mai molte schede contemporaneamente.
- Se Google mostra CAPTCHA, verifica attività o traffico anomalo, il job passa a `GOOGLE_VERIFICATION_REQUIRED` e si ferma. Nessun tentativo di aggiramento.
- Vengono raccolti soltanto riferimenti pubblicamente presenti nelle pagine consultate.
- Nessuna email viene generata o ipotizzata.
- `advertiser_name` e `owner_name` restano concetti distinti; il Companion non attribuisce automaticamente la proprietà dell'immobile.
- Il civico non viene usato per identificare residenti privati.

## Versione

`20260914-companion1`
