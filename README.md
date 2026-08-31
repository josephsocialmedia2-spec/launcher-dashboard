# F1 Immobiliare — Launcher centralizzato

## Ingresso unico

L'interfaccia operativa canonica e `oggi.html`.

Regola: l'utente parte sempre da **OGGI COSA FACCIO**. Le altre pagine non sono programmi concorrenti: sono viste, archivi o componenti tecnici richiamati dalla cabina di regia.

## Flusso principale

`Seller Radar AUTO -> quality gate -> Giro Acquisizione -> Telefonate -> Brief / Market Intelligence -> CRM -> OGGI COSA FACCIO`

## Componenti registrati

Il file `system-registry.json` elenca le viste operative, i moduli Radar/Intelligence, le attivita programmate, l'infrastruttura mobile/cloud e i redirect legacy.

## Mobile

La PWA parte da `oggi.html`; F1 Mobile Ready e quindi la versione smartphone della stessa cabina di regia, non un'applicazione separata.

## Legacy

Le pagine statiche o i vecchi Radar che potevano generare risultati paralleli devono essere trasformati in redirect o bridge verso il sistema canonico.
