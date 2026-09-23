# F1 Funnel Builder — Principi operativi della mappa logica mnemonica

Data: 2026-09-23

## P1 — Rappresentare conoscenza, non testo

Principio: la mappa deve esprimere concetti e relazioni, non duplicare le frasi del Blocco 2.
Fonte: Novak & Cañas, IHMC — https://cmap.ihmc.us/docs/theory-of-concept-maps
Applicazione F1: una o più righe possono alimentare lo stesso nodo. Ogni nodo conserva sourceIds.

## P2 — Le relazioni devono avere significato

Principio: una linea diventa informativa quando specifica la relazione.
Fonte: Cañas — https://cmap.ihmc.us/docs/linkingwords.php
Applicazione F1: tipi minimi: CAUSES, LEADS_TO, REQUIRES, PART_OF, SPLITS_INTO, SUMS_TO, SEQUENCE, SUPPORTS, CATEGORY_OF.

## P3 — Chunking prima del rendering

Principio: molti elementi devono essere raggruppati in unità concettuali prima della visualizzazione.
Fonti: https://link.springer.com/article/10.1007/s10648-019-09465-5 e https://pubmed.ncbi.nlm.nih.gov/11515286/
Applicazione F1: 41 righe possono produrre 6–12 macro-concetti, ma il numero emerge dai dati: non è fissato a priori.

## P4 — Nessun limite 7±2 codificato

Principio: il 7±2 storico non è una regola universale per interfacce o mappe.
Fonti: https://psychclassics.yorku.ca/Miller/ e https://pubmed.ncbi.nlm.nih.gov/11515286/
Applicazione F1: il livello essenziale usa pochi chunk, ma il limite dipende dalla struttura. Il dettaglio è espandibile.

## P5 — Coerenza: togliere il superfluo

Principio: informazioni estranee aumentano elaborazione non utile.
Fonte: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning/C98AB3A6CE760DD63C048936EA0B3B44
Applicazione F1: etichette di nodo corte; testo originale nascosto nel dettaglio; niente duplicazioni decorative.

## P6 — Segnalazione visiva

Principio: segnali coerenti possono evidenziare organizzazione ed elementi essenziali.
Fonte: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/signaling-or-cueing-principle-in-multimedia-learning/3972D4ACC628D5B53F7B2B4785DB2B06
Applicazione F1: badge per DATO, AZIONE, RISULTATO, CALCOLO; simboli relazionali coerenti; frecce con etichetta quando necessaria.

## P7 — Progressive disclosure

Principio: mostrare prima l'essenziale e i dettagli su richiesta.
Fonte: https://www.nngroup.com/articles/progressive-disclosure/
Applicazione F1: tre viste: Essenziale, Dettagliata, Fonti.

## P8 — Layout determinato dalla relazione

Principio: una relazione lineare, gerarchica o convergente richiede strutture visive diverse.
Applicazione F1: sequenza → linea; categoria → albero; due rami che contribuiscono a un totale → split/merge; cause multiple → convergenza; cross-link → grafo.

## P9 — Numeri come concetti

Principio: numeri e simboli possono essere nodi concettuali se portano significato.
Fonte: https://cmap.ihmc.us/docs/conceptmap.php
Applicazione F1: preservare euro, %, quantità, tempi, KPI e formule.

## P10 — Calcolare solo ciò che è derivabile

Principio: la mappa può esplicitare una relazione matematica, ma non inventare dati.
Applicazione F1: 200.000 × 3% = 6.000 è ammesso se 200.000 e 3% sono presenti; dati non presenti non si inventano.

## P11 — Tracciabilità obbligatoria

Principio: ogni sintesi deve poter essere ricondotta alle fonti che la sostengono.
Applicazione F1: ogni nodo e arco possiede sourceIds. Clic sul nodo → mostra le nozioni originali.

## P12 — Copertura esplicita

Principio: l'utente deve sapere se tutta la selezione è stata considerata.
Applicazione F1: mostrare elementi analizzati, cluster, nodi, relazioni. Gli elementi non classificati entrano nel gruppo DA CLASSIFICARE con sourceIds.

## P13 — Due rappresentazioni, non ridondanza

Principio: testo + rappresentazione visiva possono sostenere la comprensione, ma la ridondanza eccessiva può aumentare il carico.
Fonte: https://link.springer.com/article/10.1186/s41235-017-0087-y
Applicazione F1: nodo breve nella mappa; frase sorgente solo nel livello Fonti.

## P14 — Etichetta come richiamo mnemonico

Principio: la label deve permettere di richiamare la proposizione, non essere una parola statisticamente frequente.
Applicazione F1: preferire 12.000 € FATTURATO a FATTURATO PROVVIGIONE OPERAZIONE.

## P15 — Grafo dati prima del layout

Principio: la struttura semantica deve essere indipendente dalla rappresentazione grafica.
Applicazione F1: parsing → normalizzazione → entità → numeri → cluster → relazioni → grafo → compressione mnemonica → layout → rendering.

## Modello dati minimo

Nodo: id, label, type, sourceIds, value, unit, description, parentIds, childIds, confidence.
Relazione: from, to, type, label, sourceIds.

## Criterio di accettazione

La mappa è valida solo se, guardandola senza il testo esteso, l'utente può ricostruire il ragionamento essenziale; aprendo il dettaglio può verificare quali nozioni hanno generato ogni nodo e relazione.