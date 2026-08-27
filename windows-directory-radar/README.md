# F1 DIRECTORY RADAR — SCRIVANIA

Sistema Windows locale per preparare ogni mattina il lavoro di acquisizione F1.

## Obiettivo

Durante la notte:

1. legge gli annunci e i segnali del Radar F1;
2. ricava Comune, via e civico quando disponibili;
3. legge e aggiorna gli archivi locali di contatti pubblici;
4. consulta PagineBianche e PagineGialle tramite Chrome visibile, quando accessibili;
5. incrocia gli annunci con i contatti pubblici della stessa via;
6. ordina prima il civico esatto, poi i civici più vicini;
7. prepara il report da usare con il telefono fisso dalla scrivania.

Non usa sincronizzazione smartphone e non pubblica nomi o numeri su GitHub.

## Installazione

Scarica ed esegui:

`INSTALLA_F1_DIRECTORY_RADAR.cmd`

L'installer crea sul Desktop:

- **F1 - AGGIORNA NUMERI E ANNUNCI**
- **F1 - REPORT ACQUISIZIONE**
- **F1 - IMPORTA ELENCHI**

## Orari

- **02:30** — aggiornamento notturno automatico.
- **08:00** — apertura automatica dell'ultimo report.

Per l'esecuzione notturna il PC deve essere acceso e l'utente Windows deve essere connesso.

## Dove vengono salvati i dati

`Documenti\F1_Directory_Radar\`

Principali file:

- `contatti_master.csv`
- `RISULTATI\REPORT_MATTINO_ULTIMO.html`
- `RISULTATI\LISTA_TELEFONATE_AAAA-MM-GG.csv`
- `RISULTATI\BLOCCHI_CAPTCHA_AAAA-MM-GG.csv`
- `f1_directory_radar.log`
- `checkpoint.json`

## Importazione archivi già disponibili

Il programma prova a riconoscere automaticamente gli archivi già presenti in Download, Desktop e Documenti. In alternativa usa l'icona **F1 - IMPORTA ELENCHI** e copia nella cartella file CSV/XLSX con colonne equivalenti a:

`Nome, Telefono, Via, Civico, CAP, Comune, Fonte, Link`

Gli archivi vengono uniti senza pubblicarli su GitHub.

## PagineBianche e PagineGialle

Chrome viene aperto in modalità visibile. Il programma non usa tecniche per aggirare CAPTCHA, rate limit o blocchi anti-automazione.

Se una ricerca viene bloccata:

1. registra motore, directory, Comune, via e URL;
2. la inserisce in `BLOCCHI_CAPTCHA_...csv`;
3. continua con gli altri motori e con l'altra directory;
4. conserva i contatti già presenti nell'archivio locale.

## Report del mattino

Ogni scheda mostra:

- Comune;
- via e civico dell'annuncio;
- immobile;
- prezzo quando disponibile;
- fonte e link dell'annuncio;
- mappa;
- contatti pubblici sulla stessa via;
- civico del contatto;
- distanza numerica dal civico dell'annuncio;
- fonte del contatto;
- evidenza `CIVICO ESATTO` quando presente.

### Regola fondamentale

**Stessa via o stesso civico non significa proprietario dell'immobile.** Il programma crea una lista territoriale per attività di acquisizione e non effettua inferenze sulla proprietà.

I numeri destinati a telefonate commerciali restano marcati:

- `RPO = DA_VERIFICARE`
- `CALL ALLOWED = NO`

finché l'operatore non effettua le verifiche necessarie.
