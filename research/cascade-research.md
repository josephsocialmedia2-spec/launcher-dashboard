# F1 Funnel Builder — Ricerca sugli schemi a cascata

Data ricerca: 2026-09-23

## Domanda di progetto

Come trasformare molte nozioni selezionate nel Blocco 2 in una rappresentazione che aiuti a capire, ricordare e ricostruire il ragionamento, senza ridursi a una lista di parole?

## Risultato sintetico

La letteratura non sostiene l'idea di uno "schema a cascata" come formato unico e necessariamente lineare. Le evidenze più pertinenti convergono invece su una rappresentazione della conoscenza composta da:

1. concetti brevi e significativi;
2. relazioni esplicite tra concetti;
3. raggruppamento in unità concettuali;
4. riduzione dell'informazione estranea;
5. segnali visivi che rendono evidente l'organizzazione;
6. possibilità di mostrare prima la struttura essenziale e poi i dettagli;
7. preservazione di numeri, formule e relazioni causali quando sono parte del significato.

Per F1 Funnel Builder il modello corretto è quindi un **grafo concettuale mnemonico multilivello**, non una semplice colonna di parole.

## Fonti analizzate

### 1. Novak & Cañas — Theory Underlying Concept Maps
Fonte: IHMC, technical report 2008
URL: https://cmap.ihmc.us/docs/theory-of-concept-maps

Punto rilevante: una mappa concettuale rappresenta conoscenza mediante concetti e relazioni; le parole o frasi di collegamento specificano il rapporto tra due concetti e formano proposizioni significative.

Implicazione F1: un arco non deve essere una freccia muta quando il tipo di relazione è importante. Deve poter esprimere "porta a", "genera", "richiede", "è parte di", "si divide in", "somma a".

### 2. Cañas & Novak — What is a Concept Map?
Fonte: IHMC
URL: https://cmap.ihmc.us/docs/conceptmap.php

Punto rilevante: i concetti sono etichette sintetiche; simboli come + e % possono essere concetti validi; due o più concetti collegati da una frase di relazione formano un'unità di significato.

Implicazione F1: numeri, percentuali e simboli devono essere conservati se hanno funzione concettuale. "200.000 €", "3%", "6.000 €" non vanno eliminati dalla sintesi.

### 3. Cañas — Linking Words
Fonte: IHMC
URL: https://cmap.ihmc.us/docs/linkingwords.php

Punto rilevante: la relazione esplicita chiarisce il significato del legame tra concetti.

Implicazione F1: distinguere SEQUENZA, CAUSA, CONSEGUENZA, PARTE-TOTALE, PREREQUISITO, CATEGORIA, SOMMA e CONVERGENZA.

### 4. Sweller, van Merriënboer & Paas — Cognitive Architecture and Instructional Design: 20 Years Later
Fonte: Educational Psychology Review, 2019
URL: https://link.springer.com/article/10.1007/s10648-019-09465-5

Punto rilevante: la memoria di lavoro è limitata e il design deve minimizzare elaborazione non necessaria e favorire strutture/schema utili.

Implicazione F1: 41 nozioni non devono diventare automaticamente 41 nodi sul primo livello. Devono essere raggruppate in chunk concettuali.

### 5. de Jong — Cognitive load theory, educational research, and instructional design
Fonte: Instructional Science, 2010
URL: https://link.springer.com/article/10.1007/s11251-009-9110-0

Punto rilevante: il carico cognitivo è una cornice utile ma ha limiti concettuali e metodologici; non va applicato come formula rigida.

Implicazione F1: evitare limiti numerici dogmatici ("massimo 7 nodi") e usare il carico cognitivo come criterio di semplicità, non come numero fisso.

### 6. Cowan — The magical number 4 in short-term memory
Fonte: Behavioral and Brain Sciences, 2001 / PubMed
URL: https://pubmed.ncbi.nlm.nih.gov/11515286/

Punto rilevante: riesamina la tradizione del "7±2" di Miller e propone una capacità centrale più vicina a circa quattro chunk in molte condizioni.

Implicazione F1: Miller non giustifica un limite rigido a sette. La mappa essenziale dovrebbe mostrare pochi macro-chunk alla volta e permettere espansione.

### 7. Miller — The Magical Number Seven, Plus or Minus Two
Fonte: Psychological Review, 1956; copia storica York University
URL: https://psychclassics.yorku.ca/Miller/

Punto rilevante: il lavoro storico riguarda limiti di elaborazione e chunking, ma non deve essere trasformato in una regola UI "7 elementi sempre".

Implicazione F1: usare chunking, non un tetto numerico fisso.

### 8. Mayer / Fiorella — Coherence, Signaling, Redundancy, Spatial and Temporal Contiguity
Fonte: Cambridge Handbook of Multimedia Learning
URL: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning/C98AB3A6CE760DD63C048936EA0B3B44

Punto rilevante: eliminare materiale estraneo e segnalare l'organizzazione essenziale riduce elaborazione non necessaria.

Implicazione F1: etichette corte; colori/simboli coerenti per i tipi di relazione; niente ripetizione dell'intero testo dentro ogni nodo.

### 9. Mayer & Fiorella — Segmenting and Pre-training
Fonte: Cambridge Handbook of Multimedia Learning, 2021
URL: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning/A9E77D0172F905AC957689D1771E2888

Punto rilevante: il materiale complesso è più gestibile se segmentato e se i concetti principali sono resi riconoscibili.

Implicazione F1: tre livelli di visualizzazione: essenziale, dettagliata, fonti originali.

### 10. van Gog — Signaling / Cueing Principle
Fonte: Cambridge Handbook of Multimedia Learning, 2021
URL: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/signaling-or-cueing-principle-in-multimedia-learning/3972D4ACC628D5B53F7B2B4785DB2B06

Punto rilevante: segnali che evidenziano elementi e organizzazione possono migliorare l'apprendimento.

Implicazione F1: differenziare visivamente DATO, CAUSA, AZIONE, RISULTATO, CALCOLO, OBIETTIVO e mostrare etichette delle relazioni.

### 11. Nielsen — Progressive Disclosure
Fonte: Nielsen Norman Group, 2006
URL: https://www.nngroup.com/articles/progressive-disclosure/

Punto rilevante: mostrare inizialmente gli elementi più importanti e rendere disponibili i dettagli su richiesta aiuta a coniugare potenza e semplicità.

Implicazione F1: Livello 1 = mappa essenziale; Livello 2 = dettaglio; Livello 3 = fonti originali.

### 12. Weinstein, Madan & Sumeracki — Teaching the science of learning
Fonte: Cognitive Research: Principles and Implications, 2018
URL: https://link.springer.com/article/10.1186/s41235-017-0087-y

Punto rilevante: dual coding, elaborazione, esempi concreti e retrieval practice hanno supporto robusto; più rappresentazioni possono aiutare, ma troppe possono aumentare il carico.

Implicazione F1: combinare etichette verbali brevi con forma visiva/strutturale; evitare decorazioni o rappresentazioni ridondanti.

### 13. Anastasiou, Wirngo & Bagos — Concept maps in science achievement
Fonte: Educational Psychology Review, 2024
URL: https://link.springer.com/article/10.1007/s10648-024-09877-y

Punto rilevante: meta-analisi su 55 studi; associazione positiva tra concept mapping e apprendimento scientifico, con eterogeneità e limiti di dominio.

Implicazione F1: concept mapping ha base empirica utile, ma il programma non deve sostenere che una singola forma grafica sia universalmente ottimale.

### 14. Barta et al. — Concept mapping and critical thinking
Fonte: Educational Research Review, 2022
URL: https://www.sciencedirect.com/science/article/pii/S1747938X22000501

Punto rilevante: meta-analisi con effetti positivi sul pensiero critico, con eterogeneità e moderatori.

Implicazione F1: il valore deriva dall'esplicitare struttura e relazioni, non dal disegno decorativo.

### 15. Meta-analysis 2024 — impact of concept maps on academic achievement
Fonte: Heliyon / PubMed
URL: https://pubmed.ncbi.nlm.nih.gov/38163243/

Punto rilevante: meta-analisi di 78 studi; risultati complessivamente favorevoli, con eterogeneità.

Implicazione F1: usare mappe concettuali come base metodologica, senza trasformare l'effetto aggregato in una promessa individuale.

## Approcci confrontati

### Concept map
Vantaggi: relazioni esplicite, gerarchie, proposizioni, cross-link, numeri/simboli ammessi.
Limiti: può diventare densa; richiede selezione dei concetti e relazioni valide.
Scelta F1: **principale**.

### Mind map
Vantaggi: richiamo visivo, struttura radiale, utile per brainstorming.
Limiti: tende a enfatizzare associazione e gerarchia radiale; esprime peggio causalità, convergenze, formule e tipi di relazione.
Scelta F1: **non usata come modello principale**; alcune idee di brevità e richiamo visivo restano utili.

### Flow chart
Vantaggi: ottimo per processi e sequenze.
Limiti: forza una logica procedurale quando il contenuto è categoriale o semantico.
Scelta F1: **usato solo quando viene rilevata una vera sequenza/processo**.

### Albero gerarchico
Vantaggi: categoria → sottocategoria molto leggibile.
Limiti: non rappresenta bene convergenze, cause multiple, cross-link.
Scelta F1: **usato per tassonomie e sottoinsiemi**.

### Grafo diretto
Vantaggi: rappresenta ramificazioni, convergenze, cross-link e diversi tipi di relazione.
Limiti: può aumentare il carico visivo se mostra tutto insieme.
Scelta F1: **struttura dati di base**, con progressive disclosure.

## Principi scartati o ridimensionati

- "7±2 = massimo 7 nodi": scartato come regola UI rigida. Miller non giustifica un limite universale; Cowan e letteratura successiva mostrano una capacità più contestuale.
- "Mind map radiale per tutto": scartato perché non esprime con sufficiente precisione relazioni causali, quantitative e convergenti.
- "Una riga del Blocco 2 = un nodo": scartato perché replica il testo anziché rappresentare la conoscenza.
- "Tutto deve essere una cascata lineare": scartato. La forma deve dipendere dalla relazione.
- "Più grafica = più memoria": scartato. Dual coding e multimedia learning non giustificano decorazione o ridondanza; l'informazione visiva deve essere pertinente.

## Decisione di progetto

F1 deve usare un **modello di conoscenza a grafo** con:
- nodi sintetici;
- archi tipizzati;
- sourceIds;
- clustering semantico;
- relazioni quantitative calcolabili;
- layout adattivo: linea, ramo, convergenza o gerarchia;
- tre livelli di dettaglio;
- copertura verificabile del Blocco 2.