window.F1_SCRIPTS=window.F1_SCRIPTS||[];
window.F1_SCRIPTS.push({
  "key":"f1-011",
  "id":"F1-011",
  "label":"COPIONE",
  "shortTitle":"Persona estranea · primo contatto territoriale",
  "title":"Persona estranea: primo contatto territoriale senza relazione precedente",
  "meta":{
    "AREA":"Prospecting / Territorio / Primo contatto",
    "UTILIZZATO DA":"Funzionario F1 per primo contatto informativo e raccolta iniziale; Agente Immobiliare per eventuali approfondimenti di mediazione",
    "OBIETTIVO":"Aprire una conversazione breve e trasparente con una persona che non conosce F1, capire se esiste un interesse immobiliare attuale o futuro e ottenere, solo se utile, consenso a un ricontatto o al passaggio con l’Agente Immobiliare.",
    "QUANDO UTILIZZARLO":"Quando si entra in contatto con una persona della zona senza precedente relazione, senza un annuncio specifico, senza un immobile preciso e senza sapere se abbia intenzione di comprare, vendere o semplicemente conoscere F1."
  },
  "categories":["PROSPECTING","TERRITORIO"],
  "sections":[
    {
      "heading":"COPIONE",
      "items":[
        {"kind":"p","text":"F1: «Buongiorno, sono [NOME OPERATORE] di F1 Immobiliare. Le rubo davvero trenta secondi: se non è il momento giusto, chiudiamo qui senza problemi.»"},
        {"kind":"p","text":"F1: «Sto lavorando su [COMUNE/ZONA] per conoscere meglio le esigenze immobiliari delle persone che vivono o lavorano qui. Non la contatto perché so già che vuole vendere o comprare: vorrei solo capire se il tema casa può riguardarla adesso o più avanti.»"},
        {"kind":"p","text":"1. F1: «In questo momento per lei resta tutto com’è, oppure nei prossimi mesi potrebbe esserci un cambiamento legato alla casa?»"},
        {"kind":"p","text":"SE LA PERSONA DICE “NO”: F1: «Perfetto, non insisto. Le faccio solo un’ultima domanda: se in futuro dovesse avere bisogno di capire il mercato, vendere, comprare o semplicemente confrontarsi con qualcuno, preferisce avere il nostro riferimento oppure no?»"},
        {"kind":"p","text":"SE EMERGE UN POSSIBILE INTERESSE: F1: «Capisco. Senza entrare in dettagli personali, riguarda più una possibile vendita, un acquisto, un trasferimento oppure una situazione ancora da definire?»"},
        {"kind":"p","text":"2. F1: «È una cosa che potrebbe succedere a breve, nei prossimi mesi oppure è solo un’idea per il futuro?»"},
        {"kind":"p","text":"3. F1: «Ha già parlato con qualcuno oppure sta ancora cercando di capire da dove partire?»"},
        {"kind":"p","text":"4. F1: «Preferisce ricevere solo un riferimento informativo oppure, se la situazione è concreta, vuole che la ricontatti un Agente Immobiliare per un confronto più preciso?»"},
        {"kind":"p","text":"5. F1: «Qual è il modo migliore per ricontattarla: telefono, WhatsApp oppure nessun ricontatto per ora?»"},
        {"kind":"p","text":"CHIUSURA SENZA INTERESSE: F1: «Perfetto, grazie del tempo. Registro che al momento non desidera approfondire e non la disturbo oltre.»"},
        {"kind":"p","text":"CHIUSURA CON INTERESSE: F1: «Grazie. Registro solo le informazioni utili che mi ha dato e il consenso al ricontatto. Se serve un approfondimento immobiliare vero e proprio, il passaggio successivo sarà con l’Agente Immobiliare.»"}
      ]
    },
    {
      "heading":"POSSIBILI RISPOSTE DELLA PERSONA E RISPOSTA F1",
      "items":[
        {"kind":"dialogue","client":"PERSONA «Non mi interessa.»","response":"F1 «Perfetto, ricevuto. Non insisto e registro che non desidera approfondire.»"},
        {"kind":"dialogue","client":"PERSONA «Come ha avuto il mio numero?»","response":"F1 «Glielo spiego in modo trasparente indicando esclusivamente la fonte reale da cui proviene il contatto. Se preferisce non essere ricontattato, registro subito la sua scelta.»"},
        {"kind":"dialogue","client":"PERSONA «Non voglio agenzie.»","response":"F1 «Capisco. Non le sto chiedendo di affidare nulla. Se preferisce non ricevere altri contatti sul tema, lo registro e chiudiamo qui.»"},
        {"kind":"dialogue","client":"PERSONA «Forse venderò, ma non adesso.»","response":"F1 «Va bene. Mi interessa solo capire se esiste una finestra temporale indicativa e se desidera essere ricontattato quando per lei avrà senso. Se preferisce, non fissiamo nessun ricontatto.»"},
        {"kind":"dialogue","client":"PERSONA «Sto cercando casa.»","response":"F1 «Perfetto. Posso registrare solo zona, fascia indicativa, tempi e caratteristiche essenziali e poi farla richiamare dall’Agente Immobiliare se vuole un approfondimento.»"},
        {"kind":"dialogue","client":"PERSONA «Sto pensando di vendere.»","response":"F1 «Capito. Senza entrare ora in valutazioni o condizioni di vendita, posso registrare il suo interesse e farle proporre un confronto con l’Agente Immobiliare.»"},
        {"kind":"dialogue","client":"PERSONA «Mi mandi qualcosa e poi vedo.»","response":"F1 «Certo. Le invio solo il materiale concordato. Dopo l’invio la ricontatto soltanto se mi autorizza a farlo.»"}
      ]
    },
    {
      "heading":"DOMANDE CHIAVE",
      "items":[
        {"kind":"bullet","text":"Esiste un possibile cambiamento immobiliare attuale o futuro?"},
        {"kind":"bullet","text":"Il tema riguarda vendita, acquisto, trasferimento o semplice informazione?"},
        {"kind":"bullet","text":"Qual è la finestra temporale indicativa?"},
        {"kind":"bullet","text":"La persona ha già un professionista di riferimento?"},
        {"kind":"bullet","text":"Desidera materiale informativo?"},
        {"kind":"bullet","text":"Autorizza un ricontatto? Con quale canale?"},
        {"kind":"bullet","text":"È necessario il passaggio a un Agente Immobiliare?"}
      ]
    },
    {
      "heading":"OBIETTIVO DI CHIUSURA",
      "items":[
        {"kind":"p","text":"Non ottenere una vendita o un incarico durante il primo contatto. L’obiettivo è classificare correttamente la persona: nessun interesse, interesse futuro, richiesta informativa, potenziale acquirente, potenziale venditore oppure contatto da trasferire all’Agente Immobiliare. In assenza di consenso o interesse, chiudere con cortesia."}
      ]
    },
    {
      "heading":"DATI DA REGISTRARE NEL CRM",
      "items":[
        {"kind":"bullet","text":"Nome e recapito, solo se disponibili e pertinenti"},
        {"kind":"bullet","text":"Comune / zona"},
        {"kind":"bullet","text":"Fonte reale del contatto"},
        {"kind":"bullet","text":"Esito: non interessato / futuro / informativo / acquisto / vendita / trasferimento"},
        {"kind":"bullet","text":"Tempistica indicativa"},
        {"kind":"bullet","text":"Professionista già presente: sì/no/non dichiarato"},
        {"kind":"bullet","text":"Consenso o preferenza di ricontatto"},
        {"kind":"bullet","text":"Canale preferito: telefono / WhatsApp / altro / nessuno"},
        {"kind":"bullet","text":"Passaggio ad Agente Immobiliare: sì/no"},
        {"kind":"bullet","text":"Eventuale data del prossimo ricontatto"}
      ]
    },
    {
      "heading":"REGOLE OPERATIVE",
      "items":[
        {"kind":"bullet","text":"Presentarsi sempre con nome e realtà F1; non simulare conoscenze o motivi di contatto inesistenti."},
        {"kind":"bullet","text":"Se viene chiesta la provenienza del recapito, indicare esclusivamente la fonte reale e verificabile."},
        {"kind":"bullet","text":"Se la persona chiede di non essere ricontattata, registrare immediatamente la preferenza e interrompere il percorso commerciale."},
        {"kind":"bullet","text":"Il funzionario non tratta prezzo, provvigioni, incarichi, proposte o negoziazione: quando emerge un’esigenza concreta, trasferisce il contatto all’Agente Immobiliare."},
        {"kind":"bullet","text":"Registrare nel CRM solo informazioni pertinenti al contatto e al successivo percorso concordato."}
      ]
    }
  ]
});
