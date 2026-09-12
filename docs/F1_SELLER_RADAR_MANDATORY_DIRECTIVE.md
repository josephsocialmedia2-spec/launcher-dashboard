# F1 Seller Radar — Direttiva Operativa Obbligatoria

## 1. Centro territoriale
Il centro unico del Seller Radar e di tutti i moduli territoriali F1 è **Villar Dora**.

Il territorio deve essere sempre rappresentato come:

- CENTRO: Villar Dora;
- SINISTRA: comuni definiti in `config/territory.json`;
- DESTRA: comuni definiti in `config/territory.json`;
- fasce radiali progressive secondo `distance_bands_km`.

Nessun modulo può mantenere una lista territoriale autonoma o diversa.

## 2. Copertura mercato obbligatoria
Per ogni comune del territorio canonico devono essere controllate tutte le fonti configurate disponibili al sistema.

Ogni annuncio osservato deve essere registrato. Se una fonte non è tecnicamente accessibile, il sistema deve indicare copertura incompleta: non deve dichiarare di aver controllato ciò che non ha potuto leggere.

## 3. CRM obbligatorio
Ogni annuncio/immobile osservato deve avere una scheda CRM collegata.

Categorie minime:

- `COMPETITOR_LISTING`: annuncio riconosciuto come agenzia concorrente;
- `MARKET_LISTING`: annuncio acquisito ma venditore ancora da classificare;
- `FSBO_CANDIDATE`: indizio di vendita privata da verificare;
- `FSBO`: vendita privata con evidenza sufficiente;
- `EXPIRED_CANDIDATE`: possibile scaduto / ritirato / non più rilevato / cambio agenzia / ripubblicato;
- `EXPIRED_VERIFIED`: incarico scaduto solo con evidenza esplicita.

Nessun segnale può restare soltanto in una pagina, in un file pubblico o in una tabella tecnica senza collegamento CRM.

## 4. Concorrenza
Gli annunci riconosciuti come concorrenza devono mantenere almeno:

- fonte;
- URL;
- comune;
- via/zona se disponibile;
- prima osservazione;
- ultima osservazione;
- prezzo e variazioni quando disponibili;
- stato annuncio;
- storico osservazioni;
- prossima azione di monitoraggio.

## 5. Scaduti
Un annuncio scomparso non equivale a venduto e non equivale automaticamente a incarico scaduto.

Senza evidenza esplicita usare `EXPIRED_CANDIDATE` e task `VERIFY`.

Solo evidenza esplicita consente `EXPIRED_VERIFIED` / incarico scaduto verificato.

## 6. Privati
Un semplice indizio privato genera `FSBO_CANDIDATE` + `VERIFY`.

Solo una dichiarazione sufficientemente esplicita di vendita privata/FSBO consente la categoria `FSBO`. Anche in questo caso un eventuale contatto resta subordinato ai controlli RPO/DNC e agli altri requisiti applicabili.

## 7. Flusso obbligatorio

`ANNUNCIO OSSERVATO → PROPERTY → OBSERVATION → CRM LEAD → CLASSIFICAZIONE → TASK → AZIONE → ESITO → PROSSIMA AZIONE`

Il sistema deve rendere verificabile ogni passaggio.
