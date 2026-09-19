window.F1_SCRIPTS = [
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Lavoro con proprietari della zona e le faccio una domanda diretta: sta valutando di vendere questo immobile, ora o nei prossimi mesi?",
      "Se sì, qual è il motivo principale che la porta a pensarci proprio adesso?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Lavoro con proprietari della zona e le faccio una domanda diretta",
      "sta valutando di vendere questo immobile",
      "ora o nei prossimi mesi?",
      "qual è il motivo principale che la porta a pensarci proprio adesso?"
    ],
    "id": "acq-01-creare-lead",
    "workflowPhase": 1,
    "workflowOrder": 100,
    "subcategory": "01 · Creare il lead",
    "title": "Creare il lead venditore",
    "purpose": "Aprire una conversazione e verificare se esiste un progetto immobiliare reale.",
    "usage": "Prospecting, database, zona, privati, scaduti o referral.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Lavoro con proprietari della zona e le faccio una domanda diretta: sta valutando di vendere questo immobile, ora o nei prossimi mesi? Se sì, qual è il motivo principale che la porta a pensarci proprio adesso?",
    "roleplayClient": "Sì, ci sto pensando, ma non ho ancora deciso.",
    "roleplayAgent": "Capisco. Per capire se posso esserle utile: cosa dovrebbe succedere perché la vendita diventi una decisione concreta?",
    "keywords": [
      "PROGETTO",
      "MOTIVAZIONE",
      "TEMPI",
      "DECISIONE",
      "APPUNTAMENTO"
    ],
    "memoryMap": [
      "PRESENTATI",
      "DOMANDA DIRETTA",
      "MOTIVAZIONE",
      "TEMPI",
      "PROSSIMO PASSO"
    ],
    "objections": [
      "Non ho deciso",
      "Non sono interessato"
    ],
    "followUps": [
      "Qual è il motivo principale?",
      "Quando pensa di decidere?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/"
  },
  {
    "id": "prospecting-generale",
    "category": "PROSPECTING",
    "subcategory": "Generale",
    "title": "Prospecting generale",
    "purpose": "Creare una conversazione con un proprietario e verificare una possibile intenzione di vendita.",
    "usage": "Durante una sessione quotidiana di prospecting.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Sto lavorando con proprietari e acquirenti nella zona e la chiamo per una domanda molto semplice: ha mai pensato di vendere il suo immobile, ora o nei prossimi mesi? Se la risposta è no, posso chiederle se conosce qualcuno in zona che sta valutando di vendere?",
    "roleplayClient": "Non sto pensando di vendere.",
    "roleplayAgent": "Capisco. Posso chiederle se conosce qualcuno in zona che potrebbe farlo?",
    "memory": [
      "Domanda diretta",
      "ascolta la motivazione",
      "cerca l'appuntamento, non la vendita al telefono."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-prospecting-leads-to-more-production/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "generale",
      "prospecting",
      "generale"
    ],
    "workflowPhase": 1,
    "workflowOrder": 100,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Sto lavorando con proprietari e acquirenti nella zona e la chiamo per una domanda molto semplice: ha mai pensato di vendere il suo immobile, ora o nei prossimi mesi?",
      "Se la risposta è no, posso chiederle se conosce qualcuno in zona che sta valutando di vendere?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Sto lavorando con proprietari e acquirenti nella zona e la chiamo per una domanda molto semplice",
      "ha mai pensato di vendere il suo immobile",
      "ora o nei prossimi mesi?",
      "Se la risposta è no",
      "posso chiederle se conosce qualcuno in zona che sta valutando di vendere?"
    ],
    "keywords": [
      "DOMANDA DIRETTA",
      "ASCOLTA LA MOTIVAZIONE",
      "CERCA L'APPUNTAMENTO NON LA VENDITA AL TELEFONO",
      "PROSPECTING",
      "GENERALE"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "Non sto pensando di vendere."
    ],
    "followUps": [
      "Capisco. Posso chiederle se conosce qualcuno in zona che potrebbe farlo?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "circle-prospecting",
    "category": "PROSPECTING",
    "subcategory": "Farming",
    "title": "Circle prospecting",
    "purpose": "Individuare proprietari potenzialmente interessati a vendere intorno a un'attività di zona.",
    "usage": "Quando stai lavorando una micro-area o una via.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Sto lavorando proprio nella sua zona e sto aggiornando i proprietari su quello che sta succedendo nel mercato locale. Per curiosità: se oggi trovassimo un acquirente serio per il suo immobile, prenderebbe in considerazione una vendita?",
    "roleplayClient": "No, non credo.",
    "roleplayAgent": "Perfetto. Se dovesse cambiare qualcosa nei prossimi mesi, posso essere il suo riferimento per una valutazione aggiornata?",
    "memory": [
      "Usa un fatto locale reale",
      "formula una domanda semplice",
      "ottieni permesso per il follow-up."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "farming",
      "circle",
      "prospecting"
    ],
    "workflowPhase": 1,
    "workflowOrder": 101,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Sto lavorando proprio nella sua zona e sto aggiornando i proprietari su quello che sta succedendo nel mercato locale.",
      "Per curiosità: se oggi trovassimo un acquirente serio per il suo immobile, prenderebbe in considerazione una vendita?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Sto lavorando proprio nella sua zona e sto aggiornando i proprietari su quello che sta succedendo nel mercato locale.",
      "Per curiosità",
      "se oggi trovassimo un acquirente serio per il suo immobile",
      "prenderebbe in considerazione una vendita?"
    ],
    "keywords": [
      "USA UN FATTO LOCALE REALE",
      "FORMULA UNA DOMANDA SEMPLICE",
      "OTTIENI PERMESSO PER IL FOLLOW-UP",
      "PROSPECTING",
      "FARMING",
      "CIRCLE"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "No, non credo."
    ],
    "followUps": [
      "Perfetto. Se dovesse cambiare qualcosa nei prossimi mesi, posso essere il suo riferimento per una valutazione aggiornata?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "porta-a-porta",
    "category": "PROSPECTING",
    "subcategory": "Porta a porta",
    "title": "Porta a porta",
    "purpose": "Aprire una conversazione breve e naturale con un proprietario.",
    "usage": "Durante farming e ricerca notizie in zona.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Sto facendo un aggiornamento della zona e volevo farle una domanda veloce: sa se in questa via c'è qualcuno che sta pensando di vendere? E lei, per caso, ha programmi immobiliari nei prossimi mesi?",
    "roleplayClient": "Non so nulla.",
    "roleplayAgent": "Nessun problema, grazie. Se dovesse sentire qualcosa o avere bisogno di un valore aggiornato del suo immobile, mi trova qui in zona.",
    "memory": [
      "Presentazione breve",
      "una sola domanda alla volta",
      "uscita elegante."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "porta",
      "a",
      "porta",
      "porta",
      "a",
      "porta"
    ],
    "workflowPhase": 1,
    "workflowOrder": 102,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Sto facendo un aggiornamento della zona e volevo farle una domanda veloce: sa se in questa via c'è qualcuno che sta pensando di vendere?",
      "E lei, per caso, ha programmi immobiliari nei prossimi mesi?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Sto facendo un aggiornamento della zona e volevo farle una domanda veloce",
      "sa se in questa via c'è qualcuno che sta pensando di vendere?",
      "ha programmi immobiliari nei prossimi mesi?"
    ],
    "keywords": [
      "PRESENTAZIONE BREVE",
      "UNA SOLA DOMANDA ALLA VOLTA",
      "USCITA ELEGANTE",
      "PROSPECTING",
      "PORTA"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "Non so nulla."
    ],
    "followUps": [
      "Nessun problema, grazie. Se dovesse sentire qualcosa o avere bisogno di un valore aggiornato del suo immobile, mi trova qui in zona."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "just-listed-telefono",
    "category": "JUST LISTED / JUST SOLD",
    "subcategory": "Just Listed",
    "title": "Appena acquisito — vicini",
    "purpose": "Usare una nuova acquisizione per creare conversazioni nella zona.",
    "usage": "Subito dopo aver acquisito un immobile.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. La contatto perché abbiamo appena iniziato a lavorare su un immobile nella sua zona. Prima che inizi la promozione volevo chiedere: conosce qualcuno che vorrebbe trasferirsi qui? E, per curiosità, lei ha mai pensato di vendere?",
    "roleplayClient": "No, ma conosco qualcuno.",
    "roleplayAgent": "Ottimo. Se crede possa essergli utile, gli lasci pure il mio contatto oppure, con il suo consenso, posso sentirlo direttamente.",
    "memory": [
      "Usa la notizia reale",
      "chiedi referral",
      "verifica anche il possibile seller."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_incarichi_appena_acquisiti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "just",
      "listed",
      "/",
      "just",
      "sold",
      "just",
      "listed",
      "appena",
      "acquisito",
      "—",
      "vicini"
    ],
    "workflowPhase": 1,
    "workflowOrder": 111,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "La contatto perché abbiamo appena iniziato a lavorare su un immobile nella sua zona.",
      "Prima che inizi la promozione volevo chiedere: conosce qualcuno che vorrebbe trasferirsi qui?",
      "E, per curiosità, lei ha mai pensato di vendere?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "La contatto perché abbiamo appena iniziato a lavorare su un immobile nella sua zona.",
      "Prima che inizi la promozione volevo chiedere",
      "conosce qualcuno che vorrebbe trasferirsi qui?",
      "per curiosità",
      "lei ha mai pensato di vendere?"
    ],
    "keywords": [
      "USA LA NOTIZIA REALE",
      "CHIEDI REFERRAL",
      "VERIFICA ANCHE IL POSSIBILE SELLER",
      "JUST",
      "LISTED",
      "SOLD",
      "APPENA"
    ],
    "memoryMap": [
      "NOTIZIA",
      "DOMANDA",
      "REFERRAL",
      "POSSIBILE SELLER",
      "FOLLOW-UP"
    ],
    "objections": [
      "No, ma conosco qualcuno."
    ],
    "followUps": [
      "Ottimo. Se crede possa essergli utile, gli lasci pure il mio contatto oppure, con il suo consenso, posso sentirlo direttamente."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "just-listed-porta",
    "category": "JUST LISTED / JUST SOLD",
    "subcategory": "Just Listed",
    "title": "Appena acquisito — porta a porta",
    "purpose": "Creare notizia e raccogliere segnali venditore nella micro-area.",
    "usage": "Quando lavori i civici vicini a un nuovo incarico.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Stiamo iniziando la vendita di un immobile qui vicino e sto informando i residenti della zona. Conosce qualcuno che vorrebbe abitare qui? Oppure qualcuno che sta valutando di vendere?",
    "roleplayClient": "Non saprei.",
    "roleplayAgent": "Nessun problema. Se le interessa, quando avremo dati reali su richieste e visite posso aggiornarla su come sta reagendo il mercato.",
    "memory": [
      "Notizia",
      "vicinanza",
      "referral",
      "follow-up con dati reali."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_incarichi_appena_acquisiti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "just",
      "listed",
      "/",
      "just",
      "sold",
      "just",
      "listed",
      "appena",
      "acquisito",
      "—",
      "porta",
      "a",
      "porta"
    ],
    "workflowPhase": 1,
    "workflowOrder": 112,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Stiamo iniziando la vendita di un immobile qui vicino e sto informando i residenti della zona.",
      "Conosce qualcuno che vorrebbe abitare qui?",
      "Oppure qualcuno che sta valutando di vendere?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Stiamo iniziando la vendita di un immobile qui vicino e sto informando i residenti della zona.",
      "Conosce qualcuno che vorrebbe abitare qui?",
      "Oppure qualcuno che sta valutando di vendere?"
    ],
    "keywords": [
      "NOTIZIA",
      "VICINANZA",
      "REFERRAL",
      "FOLLOW-UP CON DATI REALI",
      "JUST",
      "LISTED",
      "SOLD"
    ],
    "memoryMap": [
      "NOTIZIA",
      "DOMANDA",
      "REFERRAL",
      "POSSIBILE SELLER",
      "FOLLOW-UP"
    ],
    "objections": [
      "Non saprei."
    ],
    "followUps": [
      "Nessun problema. Se le interessa, quando avremo dati reali su richieste e visite posso aggiornarla su come sta reagendo il mercato."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "just-sold-telefono",
    "category": "JUST LISTED / JUST SOLD",
    "subcategory": "Just Sold",
    "title": "Venduto — vicini",
    "purpose": "Trasformare una vendita conclusa in prova di mercato e nuove conversazioni.",
    "usage": "Dopo una vendita effettivamente conclusa.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. La chiamo perché abbiamo concluso una vendita nella sua zona. Alcuni proprietari ci chiedono cosa significhi per il valore delle loro case. Lei sarebbe curioso di conoscere una stima aggiornata del suo immobile?",
    "roleplayClient": "Non voglio vendere.",
    "roleplayAgent": "Perfetto, la valutazione può essere utile anche solo per conoscere la situazione patrimoniale. Se preferisce, la aggiorno più avanti.",
    "memory": [
      "Usa solo vendite reali",
      "invita alla valutazione",
      "non creare falsa urgenza."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "just",
      "listed",
      "/",
      "just",
      "sold",
      "just",
      "sold",
      "venduto",
      "—",
      "vicini"
    ],
    "workflowPhase": 1,
    "workflowOrder": 113,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "La chiamo perché abbiamo concluso una vendita nella sua zona.",
      "Alcuni proprietari ci chiedono cosa significhi per il valore delle loro case.",
      "Lei sarebbe curioso di conoscere una stima aggiornata del suo immobile?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "La chiamo perché abbiamo concluso una vendita nella sua zona.",
      "Alcuni proprietari ci chiedono cosa significhi per il valore delle loro case.",
      "Lei sarebbe curioso di conoscere una stima aggiornata del suo immobile?"
    ],
    "keywords": [
      "USA SOLO VENDITE REALI",
      "INVITA ALLA VALUTAZIONE",
      "NON CREARE FALSA URGENZA",
      "JUST",
      "LISTED",
      "SOLD",
      "VENDUTO"
    ],
    "memoryMap": [
      "NOTIZIA",
      "DOMANDA",
      "REFERRAL",
      "POSSIBILE SELLER",
      "FOLLOW-UP"
    ],
    "objections": [
      "Non voglio vendere."
    ],
    "followUps": [
      "Perfetto, la valutazione può essere utile anche solo per conoscere la situazione patrimoniale. Se preferisce, la aggiorno più avanti."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "database-past-client",
    "category": "DATABASE",
    "subcategory": "Past client",
    "title": "Cliente passato",
    "purpose": "Mantenere relazione e generare referral.",
    "usage": "Contatto periodico con ex clienti.",
    "italianAdapted": "Buongiorno [NOME], come sta? La contatto per sapere come va nella nuova casa e per tenerla aggiornata sul mercato. C'è qualcosa di immobiliare su cui posso aiutarla? E conosce qualcuno che in questo periodo sta pensando di vendere o comprare?",
    "roleplayClient": "No, tutto bene.",
    "roleplayAgent": "Mi fa piacere. Rimango il suo riferimento; se sente qualcuno che ha bisogno di un parere, può metterci in contatto.",
    "memory": [
      "Relazione prima",
      "servizio",
      "referral esplicito ma naturale."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "database",
      "past",
      "client",
      "cliente",
      "passato"
    ],
    "workflowPhase": 1,
    "workflowOrder": 114,
    "sentences": [
      "Buongiorno [NOME], come sta?",
      "La contatto per sapere come va nella nuova casa e per tenerla aggiornata sul mercato.",
      "C'è qualcosa di immobiliare su cui posso aiutarla?",
      "E conosce qualcuno che in questo periodo sta pensando di vendere o comprare?"
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "come sta?",
      "La contatto per sapere come va nella nuova casa e per tenerla aggiornata sul mercato.",
      "C'è qualcosa di immobiliare su cui posso aiutarla?",
      "E conosce qualcuno che in questo periodo sta pensando di vendere o comprare?"
    ],
    "keywords": [
      "RELAZIONE PRIMA",
      "SERVIZIO",
      "REFERRAL ESPLICITO MA NATURALE",
      "DATABASE",
      "PAST",
      "CLIENT",
      "CLIENTE"
    ],
    "memoryMap": [
      "RAPPORTO",
      "DOMANDA",
      "PROGETTO IMMOBILIARE",
      "REFERRAL",
      "FOLLOW-UP"
    ],
    "objections": [
      "No, tutto bene."
    ],
    "followUps": [
      "Mi fa piacere. Rimango il suo riferimento; se sente qualcuno che ha bisogno di un parere, può metterci in contatto."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "database-coi",
    "category": "DATABASE",
    "subcategory": "COI",
    "title": "Sfera di influenza",
    "purpose": "Attivare conoscenti e contatti come fonte di opportunità.",
    "usage": "Follow-up periodico della sfera.",
    "italianAdapted": "Ciao [NOME], sto lavorando molto nella zona e ti chiedo un favore professionale: chi conosci che potrebbe avere bisogno di vendere, comprare o semplicemente capire il valore di casa? Non serve che sia già deciso; mi basta poter essere una risorsa.",
    "roleplayClient": "Non mi viene in mente nessuno.",
    "roleplayAgent": "Nessun problema. Se nei prossimi giorni senti qualcuno parlare di casa, mutuo, trasferimento o eredità, pensami.",
    "memory": [
      "Domanda specifica",
      "riduci la soglia del referral",
      "resta top-of-mind."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "database",
      "coi",
      "sfera",
      "di",
      "influenza"
    ],
    "workflowPhase": 1,
    "workflowOrder": 115,
    "sentences": [
      "Ciao [NOME], sto lavorando molto nella zona e ti chiedo un favore professionale: chi conosci che potrebbe avere bisogno di vendere, comprare o semplicemente capire il valore di casa?",
      "Non serve che sia già deciso; mi basta poter essere una risorsa."
    ],
    "microSentences": [
      "Ciao [NOME]",
      "sto lavorando molto nella zona e ti chiedo un favore professionale",
      "chi conosci che potrebbe avere bisogno di vendere",
      "comprare o semplicemente capire il valore di casa?",
      "Non serve che sia già deciso",
      "mi basta poter essere una risorsa."
    ],
    "keywords": [
      "DOMANDA SPECIFICA",
      "RIDUCI LA SOGLIA DEL REFERRAL",
      "RESTA TOP-OF-MIND",
      "DATABASE",
      "COI",
      "SFERA",
      "INFLUENZA"
    ],
    "memoryMap": [
      "RAPPORTO",
      "DOMANDA",
      "PROGETTO IMMOBILIARE",
      "REFERRAL",
      "FOLLOW-UP"
    ],
    "objections": [
      "Non mi viene in mente nessuno."
    ],
    "followUps": [
      "Nessun problema. Se nei prossimi giorni senti qualcuno parlare di casa, mutuo, trasferimento o eredità, pensami."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "database-valore",
    "category": "DATABASE",
    "subcategory": "Aggiornamento",
    "title": "Aggiornamento valore",
    "purpose": "Creare un motivo utile per ricontattare il database.",
    "usage": "Quando hai dati aggiornati della zona.",
    "italianAdapted": "Buongiorno [NOME], la contatto perché sto aggiornando i valori della zona. Se vuole, posso darle un'indicazione attuale del valore del suo immobile e spiegarle cosa sta cambiando nelle richieste degli acquirenti.",
    "roleplayClient": "Non devo vendere.",
    "roleplayAgent": "Va benissimo. È semplicemente un aggiornamento patrimoniale; se un domani cambiano i suoi programmi avrà già un riferimento.",
    "memory": [
      "Valore senza pressione",
      "dati locali",
      "permesso per follow-up."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "database",
      "aggiornamento",
      "aggiornamento",
      "valore"
    ],
    "workflowPhase": 1,
    "workflowOrder": 116,
    "sentences": [
      "Buongiorno [NOME], la contatto perché sto aggiornando i valori della zona.",
      "Se vuole, posso darle un'indicazione attuale del valore del suo immobile e spiegarle cosa sta cambiando nelle richieste degli acquirenti."
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "la contatto perché sto aggiornando i valori della zona.",
      "posso darle un'indicazione attuale del valore del suo immobile e spiegarle cosa sta cambiando nelle richieste degli acquirenti."
    ],
    "keywords": [
      "VALORE SENZA PRESSIONE",
      "DATI LOCALI",
      "PERMESSO PER FOLLOW-UP",
      "DATABASE",
      "AGGIORNAMENTO",
      "VALORE"
    ],
    "memoryMap": [
      "RAPPORTO",
      "DOMANDA",
      "PROGETTO IMMOBILIARE",
      "REFERRAL",
      "FOLLOW-UP"
    ],
    "objections": [
      "Non devo vendere."
    ],
    "followUps": [
      "Va benissimo. È semplicemente un aggiornamento patrimoniale; se un domani cambiano i suoi programmi avrà già un riferimento."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "referral-post-vendita",
    "category": "REFERRAL",
    "subcategory": "Post vendita",
    "title": "Referral dopo la vendita",
    "purpose": "Chiedere introduzioni quando il cliente ha sperimentato il servizio.",
    "usage": "Dopo una vendita conclusa e cliente soddisfatto.",
    "italianAdapted": "Sono contento che abbiamo concluso bene. Posso chiederle un favore? Chi conosce che potrebbe avere bisogno dello stesso tipo di aiuto per vendere o comprare? Se le viene in mente qualcuno, mi farà piacere essere una risorsa senza alcuna pressione.",
    "roleplayClient": "Non mi viene in mente nessuno.",
    "roleplayAgent": "Nessun problema. Se più avanti qualcuno parla di casa o trasferimento, può semplicemente girargli il mio contatto.",
    "memory": [
      "Chiedi dopo aver creato valore",
      "referral semplice",
      "nessun imbarazzo."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "referral",
      "post",
      "vendita",
      "referral",
      "dopo",
      "la",
      "vendita"
    ],
    "workflowPhase": 1,
    "workflowOrder": 145,
    "sentences": [
      "Sono contento che abbiamo concluso bene.",
      "Posso chiederle un favore?",
      "Chi conosce che potrebbe avere bisogno dello stesso tipo di aiuto per vendere o comprare?",
      "Se le viene in mente qualcuno, mi farà piacere essere una risorsa senza alcuna pressione."
    ],
    "microSentences": [
      "Sono contento che abbiamo concluso bene.",
      "Posso chiederle un favore?",
      "Chi conosce che potrebbe avere bisogno dello stesso tipo di aiuto per vendere o comprare?",
      "Se le viene in mente qualcuno",
      "mi farà piacere essere una risorsa senza alcuna pressione."
    ],
    "keywords": [
      "CHIEDI DOPO AVER CREATO VALORE",
      "REFERRAL SEMPLICE",
      "NESSUN IMBARAZZO",
      "REFERRAL",
      "POST",
      "VENDITA",
      "DOPO"
    ],
    "memoryMap": [
      "CONTESTO",
      "DOMANDA SPECIFICA",
      "CONSENSO",
      "INTRODUZIONE",
      "FOLLOW-UP"
    ],
    "objections": [
      "Non mi viene in mente nessuno."
    ],
    "followUps": [
      "Nessun problema. Se più avanti qualcuno parla di casa o trasferimento, può semplicemente girargli il mio contatto."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "open-house-prospecting",
    "category": "PROSPECTING",
    "subcategory": "Open house",
    "title": "Prospecting da open house",
    "purpose": "Usare un open house come occasione reale di conversazione con vicini e potenziali venditori.",
    "usage": "Prima e dopo un open house effettivamente programmato.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Organizziamo un open house qui in zona e sto avvisando i residenti. Se conosce qualcuno che vorrebbe trasferirsi qui, è il benvenuto. E già che ci siamo: lei ha mai pensato di cambiare casa nei prossimi dodici mesi?",
    "roleplayClient": "No.",
    "roleplayAgent": "Perfetto. Se vuole, dopo l'evento posso aggiornarla su quanta domanda reale abbiamo visto in zona.",
    "memory": [
      "Evento reale",
      "invito",
      "possibile seller",
      "follow-up con dati."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "open",
      "house",
      "prospecting",
      "da",
      "open",
      "house"
    ],
    "workflowPhase": 1,
    "workflowOrder": 151,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Organizziamo un open house qui in zona e sto avvisando i residenti.",
      "Se conosce qualcuno che vorrebbe trasferirsi qui, è il benvenuto.",
      "E già che ci siamo: lei ha mai pensato di cambiare casa nei prossimi dodici mesi?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Organizziamo un open house qui in zona e sto avvisando i residenti.",
      "Se conosce qualcuno che vorrebbe trasferirsi qui",
      "è il benvenuto.",
      "E già che ci siamo",
      "lei ha mai pensato di cambiare casa nei prossimi dodici mesi?"
    ],
    "keywords": [
      "EVENTO REALE",
      "INVITO",
      "POSSIBILE SELLER",
      "FOLLOW-UP CON DATI",
      "PROSPECTING",
      "OPEN",
      "HOUSE"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "No."
    ],
    "followUps": [
      "Perfetto. Se vuole, dopo l'evento posso aggiornarla su quanta domanda reale abbiamo visto in zona."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "sign-call",
    "category": "PROSPECTING",
    "subcategory": "Inbound",
    "title": "Chiamata da cartello",
    "purpose": "Convertire una richiesta su un immobile in una qualificazione utile.",
    "usage": "Quando un potenziale acquirente chiama da un cartello o annuncio.",
    "italianAdapted": "Certamente, le do tutte le informazioni. Prima però mi aiuta a capire cosa sta cercando? Quali caratteristiche sono indispensabili? Entro quando vorrebbe acquistare? Deve vendere un immobile prima di comprare?",
    "roleplayClient": "Voglio solo sapere il prezzo.",
    "roleplayAgent": "Certo, glielo dico subito. Poi, se vuole, in un minuto capisco se questo immobile è davvero adatto o se devo indicarle alternative migliori.",
    "memory": [
      "Rispondi alla domanda",
      "poi qualifica",
      "non trattenere informazioni come leva."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "inbound",
      "chiamata",
      "da",
      "cartello"
    ],
    "workflowPhase": 1,
    "workflowOrder": 152,
    "sentences": [
      "Certamente, le do tutte le informazioni.",
      "Prima però mi aiuta a capire cosa sta cercando?",
      "Quali caratteristiche sono indispensabili?",
      "Entro quando vorrebbe acquistare?",
      "Deve vendere un immobile prima di comprare?"
    ],
    "microSentences": [
      "Certamente",
      "le do tutte le informazioni.",
      "Prima però mi aiuta a capire cosa sta cercando?",
      "Quali caratteristiche sono indispensabili?",
      "Entro quando vorrebbe acquistare?",
      "Deve vendere un immobile prima di comprare?"
    ],
    "keywords": [
      "RISPONDI ALLA DOMANDA",
      "POI QUALIFICA",
      "NON TRATTENERE INFORMAZIONI COME LEVA",
      "PROSPECTING",
      "INBOUND",
      "CHIAMATA",
      "CARTELLO"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "Voglio solo sapere il prezzo."
    ],
    "followUps": [
      "Certo, glielo dico subito. Poi, se vuole, in un minuto capisco se questo immobile è davvero adatto o se devo indicarle alternative migliori."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "tenant-occupied",
    "category": "PROSPECTING",
    "subcategory": "Locatari",
    "title": "Immobile occupato",
    "purpose": "Gestire una conversazione su un immobile locato senza creare conflitto.",
    "usage": "Quando il proprietario valuta la vendita di un immobile occupato.",
    "italianAdapted": "Prima di definire la strategia dobbiamo capire contratto, scadenze, accessi consentiti e obiettivo economico. Poi costruiamo un piano che rispetti sia i suoi interessi sia i diritti dell'inquilino e la normativa applicabile.",
    "roleplayClient": "Posso farlo vedere quando voglio.",
    "roleplayAgent": "Verifichiamo prima contratto e regole di accesso. È meglio impostare un calendario corretto che creare problemi durante la vendita.",
    "memory": [
      "Verifica contratto e legge",
      "niente promesse legali",
      "pianifica accessi."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "prospecting",
      "locatari",
      "immobile",
      "occupato"
    ],
    "workflowPhase": 1,
    "workflowOrder": 153,
    "sentences": [
      "Prima di definire la strategia dobbiamo capire contratto, scadenze, accessi consentiti e obiettivo economico.",
      "Poi costruiamo un piano che rispetti sia i suoi interessi sia i diritti dell'inquilino e la normativa applicabile."
    ],
    "microSentences": [
      "Prima di definire la strategia dobbiamo capire contratto",
      "accessi consentiti e obiettivo economico.",
      "Poi costruiamo un piano che rispetti sia i suoi interessi sia i diritti dell'inquilino e la normativa applicabile."
    ],
    "keywords": [
      "VERIFICA CONTRATTO E LEGGE",
      "NIENTE PROMESSE LEGALI",
      "PIANIFICA ACCESSI",
      "PROSPECTING",
      "LOCATARI",
      "IMMOBILE",
      "OCCUPATO"
    ],
    "memoryMap": [
      "APRI",
      "DOMANDA",
      "ASCOLTA",
      "QUALIFICA",
      "CHIUDI"
    ],
    "objections": [
      "Posso farlo vedere quando voglio."
    ],
    "followUps": [
      "Verifichiamo prima contratto e regole di accesso. È meglio impostare un calendario corretto che creare problemi durante la vendita."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "referral-coi",
    "category": "REFERRAL",
    "subcategory": "COI",
    "title": "Referral dalla sfera",
    "purpose": "Chiedere una presentazione concreta anziché un generico passaparola.",
    "usage": "Durante contatti con COI/past clients.",
    "italianAdapted": "Ti faccio una domanda specifica: tra colleghi, amici, vicini o familiari, chi ha parlato recentemente di trasferirsi, vendere, ereditare una casa o comprarne una? Se ti viene in mente qualcuno, mi presenti come persona disponibile a dare un parere, senza impegno.",
    "roleplayClient": "Forse un collega.",
    "roleplayAgent": "Perfetto. Se per lui va bene, puoi mandarci un messaggio di introduzione comune; poi gestisco io il seguito con discrezione.",
    "memory": [
      "Domanda contestuale",
      "introduzione con consenso",
      "niente pressione."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "referral",
      "coi",
      "referral",
      "dalla",
      "sfera"
    ],
    "workflowPhase": 1,
    "workflowOrder": 158,
    "sentences": [
      "Ti faccio una domanda specifica: tra colleghi, amici, vicini o familiari, chi ha parlato recentemente di trasferirsi, vendere, ereditare una casa o comprarne una?",
      "Se ti viene in mente qualcuno, mi presenti come persona disponibile a dare un parere, senza impegno."
    ],
    "microSentences": [
      "Ti faccio una domanda specifica",
      "tra colleghi",
      "vicini o familiari",
      "chi ha parlato recentemente di trasferirsi",
      "ereditare una casa o comprarne una?",
      "Se ti viene in mente qualcuno",
      "mi presenti come persona disponibile a dare un parere",
      "senza impegno."
    ],
    "keywords": [
      "DOMANDA CONTESTUALE",
      "INTRODUZIONE CON CONSENSO",
      "NIENTE PRESSIONE",
      "REFERRAL",
      "COI",
      "DALLA",
      "SFERA"
    ],
    "memoryMap": [
      "CONTESTO",
      "DOMANDA SPECIFICA",
      "CONSENSO",
      "INTRODUZIONE",
      "FOLLOW-UP"
    ],
    "objections": [
      "Forse un collega."
    ],
    "followUps": [
      "Perfetto. Se per lui va bene, puoi mandarci un messaggio di introduzione comune; poi gestisco io il seguito con discrezione."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Per capire se ha senso fissare un incontro, mi aiuta con tre cose?",
      "Perché sta valutando la vendita?",
      "Entro quando vorrebbe averla conclusa?",
      "Chi, oltre a lei, partecipa alla decisione?",
      "Se questi elementi sono chiari, le propongo il passo successivo."
    ],
    "microSentences": [
      "Per capire se ha senso fissare un incontro",
      "mi aiuta con tre cose?",
      "Perché sta valutando la vendita?",
      "Entro quando vorrebbe averla conclusa?",
      "oltre a lei",
      "partecipa alla decisione?",
      "Se questi elementi sono chiari",
      "le propongo il passo successivo."
    ],
    "id": "acq-02-qualifica-proprietario",
    "workflowPhase": 2,
    "workflowOrder": 200,
    "subcategory": "02 · Qualificare il proprietario",
    "title": "Qualifica iniziale del proprietario",
    "purpose": "Capire se il contatto ha motivazione, tempistica e autorità decisionale sufficienti per un appuntamento.",
    "usage": "Dopo che emerge una possibile intenzione di vendita.",
    "italianAdapted": "Per capire se ha senso fissare un incontro, mi aiuta con tre cose? Perché sta valutando la vendita? Entro quando vorrebbe averla conclusa? Chi, oltre a lei, partecipa alla decisione? Se questi elementi sono chiari, le propongo il passo successivo.",
    "roleplayClient": "Devo parlarne con mia moglie.",
    "roleplayAgent": "Perfetto. Allora è importante che al prossimo incontro possiate esserci entrambi, così lavoriamo sugli stessi dati e nessuno deve riferire la conversazione.",
    "keywords": [
      "MOTIVAZIONE",
      "TEMPI",
      "DECISORI",
      "APPUNTAMENTO"
    ],
    "memoryMap": [
      "MOTIVO",
      "SCADENZA",
      "DECISORI",
      "CONFERMA"
    ],
    "objections": [
      "Devo parlarne con il coniuge"
    ],
    "followUps": [
      "Possiamo fissare quando siete entrambi presenti?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/"
  },
  {
    "id": "fsbo-primo-contatto",
    "category": "FSBO",
    "subcategory": "Primo contatto",
    "title": "Privato — primo contatto",
    "purpose": "Capire motivazione, tempistica e apertura a un incontro.",
    "usage": "Quando un proprietario sta vendendo senza agenzia.",
    "italianAdapted": "Buongiorno, chiamo per l'immobile che sta vendendo privatamente. È ancora disponibile? Perfetto. Posso chiederle: cosa l'ha spinta a vendere proprio adesso? Entro quando vorrebbe concludere? E se non riuscisse a vendere da solo nei tempi previsti, prenderebbe in considerazione l'aiuto di un professionista?",
    "roleplayClient": "Voglio vendere da solo.",
    "roleplayAgent": "È comprensibile. Se riuscissi a mostrarle un piano che le fa risparmiare tempo e riduce il rischio di errori, avrebbe senso parlarne per quindici minuti?",
    "memory": [
      "Scopri motivazione",
      "tempistica",
      "piano alternativo",
      "chiedi un appuntamento."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_venditori_privati.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "fsbo",
      "primo",
      "contatto",
      "privato",
      "—",
      "primo",
      "contatto"
    ],
    "workflowPhase": 2,
    "workflowOrder": 203,
    "sentences": [
      "Buongiorno, chiamo per l'immobile che sta vendendo privatamente.",
      "È ancora disponibile?",
      "Perfetto.",
      "Posso chiederle: cosa l'ha spinta a vendere proprio adesso?",
      "Entro quando vorrebbe concludere?",
      "E se non riuscisse a vendere da solo nei tempi previsti, prenderebbe in considerazione l'aiuto di un professionista?"
    ],
    "microSentences": [
      "Buongiorno",
      "chiamo per l'immobile che sta vendendo privatamente.",
      "È ancora disponibile?",
      "Perfetto.",
      "Posso chiederle",
      "cosa l'ha spinta a vendere proprio adesso?",
      "Entro quando vorrebbe concludere?",
      "E se non riuscisse a vendere da solo nei tempi previsti",
      "prenderebbe in considerazione l'aiuto di un professionista?"
    ],
    "keywords": [
      "SCOPRI MOTIVAZIONE",
      "TEMPISTICA",
      "PIANO ALTERNATIVO",
      "CHIEDI UN APPUNTAMENTO",
      "FSBO",
      "PRIMO",
      "CONTATTO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI MOTIVAZIONE",
      "QUALIFICA",
      "ISOLA OBIEZIONE",
      "CHIUDI"
    ],
    "objections": [
      "Voglio vendere da solo."
    ],
    "followUps": [
      "È comprensibile. Se riuscissi a mostrarle un piano che le fa risparmiare tempo e riduce il rischio di errori, avrebbe senso parlarne per quindici minuti?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "fsbo-followup",
    "category": "FSBO",
    "subcategory": "Follow-up",
    "title": "Privato — follow-up",
    "purpose": "Riaprire un contatto FSBO senza pressione.",
    "usage": "Dopo il primo contatto con un privato.",
    "italianAdapted": "Buongiorno, sono [NOME]. Ci eravamo sentiti per il suo immobile. Volevo capire come sta andando: quante richieste serie ha ricevuto? Ha già avuto proposte concrete? Qual è oggi l'ostacolo principale alla vendita?",
    "roleplayClient": "Sto ancora provando.",
    "roleplayAgent": "Certo. Proprio per questo può essere utile confrontare i risultati ottenuti finora con un piano alternativo. Quando le è più comodo, oggi o domani?",
    "memory": [
      "Chiedi risultati concreti",
      "fai emergere il gap",
      "proponi confronto."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_venditori_privati.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "fsbo",
      "follow-up",
      "privato",
      "—",
      "follow-up"
    ],
    "workflowPhase": 2,
    "workflowOrder": 204,
    "sentences": [
      "Buongiorno, sono [NOME].",
      "Ci eravamo sentiti per il suo immobile.",
      "Volevo capire come sta andando: quante richieste serie ha ricevuto?",
      "Ha già avuto proposte concrete?",
      "Qual è oggi l'ostacolo principale alla vendita?"
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME].",
      "Ci eravamo sentiti per il suo immobile.",
      "Volevo capire come sta andando",
      "quante richieste serie ha ricevuto?",
      "Ha già avuto proposte concrete?",
      "Qual è oggi l'ostacolo principale alla vendita?"
    ],
    "keywords": [
      "CHIEDI RISULTATI CONCRETI",
      "FAI EMERGERE IL GAP",
      "PROPONI CONFRONTO",
      "FSBO",
      "FOLLOW-UP",
      "PRIVATO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI MOTIVAZIONE",
      "QUALIFICA",
      "ISOLA OBIEZIONE",
      "CHIUDI"
    ],
    "objections": [
      "Sto ancora provando."
    ],
    "followUps": [
      "Certo. Proprio per questo può essere utile confrontare i risultati ottenuti finora con un piano alternativo. Quando le è più comodo, oggi o domani?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "fsbo-no-agenzie",
    "category": "FSBO",
    "subcategory": "Obiezione",
    "title": "Privato — non voglio agenzie",
    "purpose": "Trasformare il rifiuto dell'agenzia in un confronto professionale.",
    "usage": "Quando il proprietario rifiuta gli agenti.",
    "italianAdapted": "Capisco che non voglia un'agenzia. Probabilmente vuole mantenere controllo e costi sotto controllo. La mia proposta non è di chiederle una decisione adesso: è solo verificare se esiste un modo per farle ottenere un risultato migliore. Se non vede valore, continui tranquillamente da solo.",
    "roleplayClient": "Non voglio firmare nulla.",
    "roleplayAgent": "Non le sto chiedendo di firmare al telefono. Le propongo soltanto un confronto breve, poi decide lei.",
    "memory": [
      "Riconosci la posizione",
      "riduci il rischio percepito",
      "chiedi un micro-impegno."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_venditori_privati.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "fsbo",
      "obiezione",
      "privato",
      "—",
      "non",
      "voglio",
      "agenzie"
    ],
    "workflowPhase": 2,
    "workflowOrder": 205,
    "sentences": [
      "Capisco che non voglia un'agenzia.",
      "Probabilmente vuole mantenere controllo e costi sotto controllo.",
      "La mia proposta non è di chiederle una decisione adesso: è solo verificare se esiste un modo per farle ottenere un risultato migliore.",
      "Se non vede valore, continui tranquillamente da solo."
    ],
    "microSentences": [
      "Capisco che non voglia un'agenzia.",
      "Probabilmente vuole mantenere controllo e costi sotto controllo.",
      "La mia proposta non è di chiederle una decisione adesso",
      "è solo verificare se esiste un modo per farle ottenere un risultato migliore.",
      "Se non vede valore",
      "continui tranquillamente da solo."
    ],
    "keywords": [
      "RICONOSCI LA POSIZIONE",
      "RIDUCI IL RISCHIO PERCEPITO",
      "CHIEDI UN MICRO-IMPEGNO",
      "FSBO",
      "OBIEZIONE",
      "PRIVATO",
      "NON"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI MOTIVAZIONE",
      "QUALIFICA",
      "ISOLA OBIEZIONE",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio firmare nulla."
    ],
    "followUps": [
      "Non le sto chiedendo di firmare al telefono. Le propongo soltanto un confronto breve, poi decide lei."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "fsbo-commissione",
    "category": "FSBO",
    "subcategory": "Provvigione",
    "title": "Privato — provvigione",
    "purpose": "Spostare la conversazione dal costo al risultato netto.",
    "usage": "Quando il privato cita il risparmio della provvigione.",
    "italianAdapted": "È corretto voler proteggere il risultato economico. La domanda utile però è: quanto le rimane realmente in tasca alla fine? Se un piano professionale producesse un prezzo netto migliore, tempi più brevi e una negoziazione più sicura, avrebbe senso valutarlo?",
    "roleplayClient": "Non voglio pagare commissioni.",
    "roleplayAgent": "Capisco. Guardiamo prima il risultato netto e poi decide se il servizio giustifica il costo.",
    "memory": [
      "Parla di netto",
      "non difendere la commissione troppo presto",
      "porta a un confronto numerico."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_venditori_privati.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "fsbo",
      "provvigione",
      "privato",
      "—",
      "provvigione"
    ],
    "workflowPhase": 2,
    "workflowOrder": 206,
    "sentences": [
      "È corretto voler proteggere il risultato economico.",
      "La domanda utile però è: quanto le rimane realmente in tasca alla fine?",
      "Se un piano professionale producesse un prezzo netto migliore, tempi più brevi e una negoziazione più sicura, avrebbe senso valutarlo?"
    ],
    "microSentences": [
      "È corretto voler proteggere il risultato economico.",
      "La domanda utile però è",
      "quanto le rimane realmente in tasca alla fine?",
      "Se un piano professionale producesse un prezzo netto migliore",
      "tempi più brevi e una negoziazione più sicura",
      "avrebbe senso valutarlo?"
    ],
    "keywords": [
      "PARLA DI NETTO",
      "NON DIFENDERE LA COMMISSIONE TROPPO PRESTO",
      "PORTA A UN CONFRONTO NUMERICO",
      "FSBO",
      "PROVVIGIONE",
      "PRIVATO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI MOTIVAZIONE",
      "QUALIFICA",
      "ISOLA OBIEZIONE",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio pagare commissioni."
    ],
    "followUps": [
      "Capisco. Guardiamo prima il risultato netto e poi decide se il servizio giustifica il costo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "fsbo-gia-acquirente",
    "category": "FSBO",
    "subcategory": "Obiezione",
    "title": "Privato — ho già un acquirente",
    "purpose": "Verificare solidità dell'acquirente e mantenere aperta un'alternativa.",
    "usage": "Quando il proprietario dice di avere già un compratore.",
    "italianAdapted": "Ottimo. Avete già verificato disponibilità economica, condizioni, tempistiche e documentazione? Avete già una proposta scritta? Se qualcosa non dovesse andare come previsto, posso restare come piano B?",
    "roleplayClient": "È un conoscente, dovrebbe comprare.",
    "roleplayAgent": "Perfetto. Le consiglio solo di verificare che ogni passaggio sia formalizzato. Se salta qualcosa, mi chiami prima di ripartire da zero.",
    "memory": [
      "Congratulati",
      "qualifica",
      "non attaccare l'acquirente",
      "resta piano B."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_venditori_privati.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "fsbo",
      "obiezione",
      "privato",
      "—",
      "ho",
      "già",
      "un",
      "acquirente"
    ],
    "workflowPhase": 2,
    "workflowOrder": 207,
    "sentences": [
      "Ottimo.",
      "Avete già verificato disponibilità economica, condizioni, tempistiche e documentazione?",
      "Avete già una proposta scritta?",
      "Se qualcosa non dovesse andare come previsto, posso restare come piano B?"
    ],
    "microSentences": [
      "Avete già verificato disponibilità economica",
      "condizioni",
      "tempistiche e documentazione?",
      "Avete già una proposta scritta?",
      "Se qualcosa non dovesse andare come previsto",
      "posso restare come piano B?"
    ],
    "keywords": [
      "CONGRATULATI",
      "QUALIFICA",
      "NON ATTACCARE L'ACQUIRENTE",
      "RESTA PIANO B",
      "FSBO",
      "OBIEZIONE",
      "PRIVATO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI MOTIVAZIONE",
      "QUALIFICA",
      "ISOLA OBIEZIONE",
      "CHIUDI"
    ],
    "objections": [
      "È un conoscente, dovrebbe comprare."
    ],
    "followUps": [
      "Perfetto. Le consiglio solo di verificare che ogni passaggio sia formalizzato. Se salta qualcosa, mi chiami prima di ripartire da zero."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "expired-primo",
    "category": "EXPIRED",
    "subcategory": "Primo contatto",
    "title": "Incarico scaduto — primo contatto",
    "purpose": "Capire perché l'immobile non ha venduto e ottenere un incontro.",
    "usage": "Quando un incarico precedente è terminato senza vendita.",
    "italianAdapted": "Buongiorno, sono [NOME] di F1 Immobiliare. Ho visto che il suo immobile è stato sul mercato e volevo farle una domanda: secondo lei, perché non si è venduto? Vuole ancora vendere? Se sì, ha senso analizzare cosa cambiare questa volta.",
    "roleplayClient": "Ho avuto una brutta esperienza.",
    "roleplayAgent": "Lo capisco. Proprio per questo il prossimo piano dovrebbe essere molto chiaro: prezzo, attività, comunicazione e verifiche periodiche. Possiamo confrontarci per quindici minuti?",
    "memory": [
      "Fai parlare il proprietario",
      "individua il problema",
      "proponi un piano diverso."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_incarichi_scaduti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "expired",
      "primo",
      "contatto",
      "incarico",
      "scaduto",
      "—",
      "primo",
      "contatto"
    ],
    "workflowPhase": 2,
    "workflowOrder": 208,
    "sentences": [
      "Buongiorno, sono [NOME] di F1 Immobiliare.",
      "Ho visto che il suo immobile è stato sul mercato e volevo farle una domanda: secondo lei, perché non si è venduto?",
      "Vuole ancora vendere?",
      "Se sì, ha senso analizzare cosa cambiare questa volta."
    ],
    "microSentences": [
      "Buongiorno",
      "sono [NOME] di F1 Immobiliare.",
      "Ho visto che il suo immobile è stato sul mercato e volevo farle una domanda",
      "secondo lei",
      "perché non si è venduto?",
      "Vuole ancora vendere?",
      "ha senso analizzare cosa cambiare questa volta."
    ],
    "keywords": [
      "FAI PARLARE IL PROPRIETARIO",
      "INDIVIDUA IL PROBLEMA",
      "PROPONI UN PIANO DIVERSO",
      "EXPIRED",
      "PRIMO",
      "CONTATTO",
      "INCARICO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI COSA NON HA FUNZIONATO",
      "MOTIVAZIONE",
      "NUOVO PIANO",
      "APPUNTAMENTO"
    ],
    "objections": [
      "Ho avuto una brutta esperienza."
    ],
    "followUps": [
      "Lo capisco. Proprio per questo il prossimo piano dovrebbe essere molto chiaro: prezzo, attività, comunicazione e verifiche periodiche. Possiamo confrontarci per quindici minuti?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "expired-precedente-agente",
    "category": "EXPIRED",
    "subcategory": "Obiezione",
    "title": "Scaduto — precedente agente",
    "purpose": "Evitare critiche al collega e riportare la conversazione sul risultato.",
    "usage": "Quando il venditore è deluso dall'agente precedente.",
    "italianAdapted": "Mi dispiace che l'esperienza non abbia prodotto il risultato che si aspettava. Non posso giudicare il lavoro di chi c'era prima senza conoscerlo. Posso però analizzare con lei cosa è successo e quali decisioni aumentano oggi le probabilità di vendita.",
    "roleplayClient": "L'agente non ha fatto nulla.",
    "roleplayAgent": "Capisco la frustrazione. Partiamo dai fatti: visite, feedback, prezzo e marketing. Da lì costruiamo un piano misurabile.",
    "memory": [
      "Non criticare",
      "lavora sui fatti",
      "prometti misurabilità, non miracoli."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_incarichi_scaduti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "expired",
      "obiezione",
      "scaduto",
      "—",
      "precedente",
      "agente"
    ],
    "workflowPhase": 2,
    "workflowOrder": 209,
    "sentences": [
      "Mi dispiace che l'esperienza non abbia prodotto il risultato che si aspettava.",
      "Non posso giudicare il lavoro di chi c'era prima senza conoscerlo.",
      "Posso però analizzare con lei cosa è successo e quali decisioni aumentano oggi le probabilità di vendita."
    ],
    "microSentences": [
      "Mi dispiace che l'esperienza non abbia prodotto il risultato che si aspettava.",
      "Non posso giudicare il lavoro di chi c'era prima senza conoscerlo.",
      "Posso però analizzare con lei cosa è successo e quali decisioni aumentano oggi le probabilità di vendita."
    ],
    "keywords": [
      "NON CRITICARE",
      "LAVORA SUI FATTI",
      "PROMETTI MISURABILITÀ NON MIRACOLI",
      "EXPIRED",
      "OBIEZIONE",
      "SCADUTO",
      "PRECEDENTE"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI COSA NON HA FUNZIONATO",
      "MOTIVAZIONE",
      "NUOVO PIANO",
      "APPUNTAMENTO"
    ],
    "objections": [
      "L'agente non ha fatto nulla."
    ],
    "followUps": [
      "Capisco la frustrazione. Partiamo dai fatti: visite, feedback, prezzo e marketing. Da lì costruiamo un piano misurabile."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "expired-followup",
    "category": "EXPIRED",
    "subcategory": "Follow-up",
    "title": "Scaduto — follow-up",
    "purpose": "Mantenere la relazione con un proprietario ancora indeciso.",
    "usage": "Dopo un primo contatto senza appuntamento.",
    "italianAdapted": "Buongiorno, la richiamo come concordato. L'ultima volta mi aveva detto che voleva prendersi qualche giorno. È ancora intenzionato a vendere? Qual è il punto che deve chiarire prima di ripartire?",
    "roleplayClient": "Non ho ancora deciso.",
    "roleplayAgent": "Va bene. Se le porto dati aggiornati e un piano preciso, può aiutarla a decidere con più informazioni. Quando possiamo vederci?",
    "memory": [
      "Riparti dalla motivazione",
      "identifica il blocco",
      "proponi dati e piano."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_incarichi_scaduti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "expired",
      "follow-up",
      "scaduto",
      "—",
      "follow-up"
    ],
    "workflowPhase": 2,
    "workflowOrder": 210,
    "sentences": [
      "Buongiorno, la richiamo come concordato.",
      "L'ultima volta mi aveva detto che voleva prendersi qualche giorno.",
      "È ancora intenzionato a vendere?",
      "Qual è il punto che deve chiarire prima di ripartire?"
    ],
    "microSentences": [
      "Buongiorno",
      "la richiamo come concordato.",
      "L'ultima volta mi aveva detto che voleva prendersi qualche giorno.",
      "È ancora intenzionato a vendere?",
      "Qual è il punto che deve chiarire prima di ripartire?"
    ],
    "keywords": [
      "RIPARTI DALLA MOTIVAZIONE",
      "IDENTIFICA IL BLOCCO",
      "PROPONI DATI E PIANO",
      "EXPIRED",
      "FOLLOW-UP",
      "SCADUTO"
    ],
    "memoryMap": [
      "APRI",
      "SCOPRI COSA NON HA FUNZIONATO",
      "MOTIVAZIONE",
      "NUOVO PIANO",
      "APPUNTAMENTO"
    ],
    "objections": [
      "Non ho ancora deciso."
    ],
    "followUps": [
      "Va bene. Se le porto dati aggiornati e un piano preciso, può aiutarla a decidere con più informazioni. Quando possiamo vederci?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "lead-caldo",
    "category": "LEAD FOLLOW-UP",
    "subcategory": "Lead caldo",
    "title": "Lead caldo",
    "purpose": "Portare rapidamente un lead motivato a un appuntamento.",
    "usage": "Quando esistono motivazione e tempistica concrete.",
    "italianAdapted": "Buongiorno [NOME], la richiamo per il progetto di vendita di cui abbiamo parlato. Mi aveva detto che vorrebbe muoversi entro [TEMPO]. È ancora così? Qual è la cosa principale che deve risolvere per procedere? Se la situazione è confermata, fissiamo un incontro e definiamo i prossimi passi.",
    "roleplayClient": "Sì, ma devo organizzarmi.",
    "roleplayAgent": "Perfetto. Proprio per questo fissiamo un incontro breve: chiariremo priorità e tempi senza obblighi.",
    "memory": [
      "Ricollega al motivo",
      "conferma tempistica",
      "proponi appuntamento."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "lead",
      "follow-up",
      "lead",
      "caldo",
      "lead",
      "caldo"
    ],
    "workflowPhase": 2,
    "workflowOrder": 217,
    "sentences": [
      "Buongiorno [NOME], la richiamo per il progetto di vendita di cui abbiamo parlato.",
      "Mi aveva detto che vorrebbe muoversi entro [TEMPO].",
      "È ancora così?",
      "Qual è la cosa principale che deve risolvere per procedere?",
      "Se la situazione è confermata, fissiamo un incontro e definiamo i prossimi passi."
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "la richiamo per il progetto di vendita di cui abbiamo parlato.",
      "Mi aveva detto che vorrebbe muoversi entro [TEMPO].",
      "È ancora così?",
      "Qual è la cosa principale che deve risolvere per procedere?",
      "Se la situazione è confermata",
      "fissiamo un incontro e definiamo i prossimi passi."
    ],
    "keywords": [
      "RICOLLEGA AL MOTIVO",
      "CONFERMA TEMPISTICA",
      "PROPONI APPUNTAMENTO",
      "LEAD",
      "FOLLOW-UP",
      "CALDO"
    ],
    "memoryMap": [
      "RICHIAMA",
      "RICORDA CONTESTO",
      "SCOPRI BLOCCO",
      "PROSSIMO PASSO",
      "DATA"
    ],
    "objections": [
      "Sì, ma devo organizzarmi."
    ],
    "followUps": [
      "Perfetto. Proprio per questo fissiamo un incontro breve: chiariremo priorità e tempi senza obblighi."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "lead-non-risponde",
    "category": "LEAD FOLLOW-UP",
    "subcategory": "Mancata risposta",
    "title": "Lead — mancata risposta",
    "purpose": "Riattivare un lead con messaggio semplice e non insistente.",
    "usage": "Dopo tentativi senza risposta.",
    "italianAdapted": "Buongiorno [NOME], sono [NOME] di F1 Immobiliare. La cercavo per capire se il suo progetto immobiliare è ancora attuale. Se sì, mi risponda pure con il momento migliore per sentirci. Se invece non è più una priorità, me lo dica e aggiorno volentieri le mie note.",
    "roleplayClient": "Non è più il momento.",
    "roleplayAgent": "Perfetto, grazie per avermelo detto. Quando cambierà qualcosa, sarò volentieri a disposizione.",
    "memory": [
      "Chiarezza",
      "facile opt-out",
      "niente inseguimento indefinito."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "lead",
      "follow-up",
      "mancata",
      "risposta",
      "lead",
      "—",
      "mancata",
      "risposta"
    ],
    "workflowPhase": 2,
    "workflowOrder": 218,
    "sentences": [
      "Buongiorno [NOME], sono [NOME] di F1 Immobiliare.",
      "La cercavo per capire se il suo progetto immobiliare è ancora attuale.",
      "Se sì, mi risponda pure con il momento migliore per sentirci.",
      "Se invece non è più una priorità, me lo dica e aggiorno volentieri le mie note."
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "sono [NOME] di F1 Immobiliare.",
      "La cercavo per capire se il suo progetto immobiliare è ancora attuale.",
      "mi risponda pure con il momento migliore per sentirci.",
      "Se invece non è più una priorità",
      "me lo dica e aggiorno volentieri le mie note."
    ],
    "keywords": [
      "CHIAREZZA",
      "FACILE OPT-OUT",
      "NIENTE INSEGUIMENTO INDEFINITO",
      "LEAD",
      "FOLLOW-UP",
      "MANCATA",
      "RISPOSTA"
    ],
    "memoryMap": [
      "RICHIAMA",
      "RICORDA CONTESTO",
      "SCOPRI BLOCCO",
      "PROSSIMO PASSO",
      "DATA"
    ],
    "objections": [
      "Non è più il momento."
    ],
    "followUps": [
      "Perfetto, grazie per avermelo detto. Quando cambierà qualcosa, sarò volentieri a disposizione."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "lead-futuro",
    "category": "LEAD FOLLOW-UP",
    "subcategory": "Nurturing",
    "title": "Lead futuro",
    "purpose": "Mantenere un contatto con progetto non immediato.",
    "usage": "Quando il cliente pensa di agire tra alcuni mesi.",
    "italianAdapted": "Buongiorno [NOME], ci eravamo detti di risentirci in questo periodo. È cambiato qualcosa rispetto al suo progetto? La tempistica resta [MESE/PERIODO]? Cosa dovrebbe succedere perché decida di procedere?",
    "roleplayClient": "È ancora presto.",
    "roleplayAgent": "Capisco. Fissiamo già un punto di aggiornamento realistico, così non la disturbo inutilmente nel frattempo.",
    "memory": [
      "Definisci trigger",
      "tempistica",
      "prossimo contatto concordato."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "lead",
      "follow-up",
      "nurturing",
      "lead",
      "futuro"
    ],
    "workflowPhase": 2,
    "workflowOrder": 219,
    "sentences": [
      "Buongiorno [NOME], ci eravamo detti di risentirci in questo periodo.",
      "È cambiato qualcosa rispetto al suo progetto?",
      "La tempistica resta [MESE/PERIODO]?",
      "Cosa dovrebbe succedere perché decida di procedere?"
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "ci eravamo detti di risentirci in questo periodo.",
      "È cambiato qualcosa rispetto al suo progetto?",
      "La tempistica resta [MESE/PERIODO]?",
      "Cosa dovrebbe succedere perché decida di procedere?"
    ],
    "keywords": [
      "DEFINISCI TRIGGER",
      "TEMPISTICA",
      "PROSSIMO CONTATTO CONCORDATO",
      "LEAD",
      "FOLLOW-UP",
      "NURTURING",
      "FUTURO"
    ],
    "memoryMap": [
      "RICHIAMA",
      "RICORDA CONTESTO",
      "SCOPRI BLOCCO",
      "PROSSIMO PASSO",
      "DATA"
    ],
    "objections": [
      "È ancora presto."
    ],
    "followUps": [
      "Capisco. Fissiamo già un punto di aggiornamento realistico, così non la disturbo inutilmente nel frattempo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "buyer-prequalifica",
    "category": "BUYER",
    "subcategory": "Prequalifica",
    "title": "Acquirente — prequalifica",
    "purpose": "Capire criteri, motivazione, tempi e sostenibilità prima delle visite.",
    "usage": "Prima di organizzare molte visite.",
    "italianAdapted": "Per aiutarla bene devo capire alcuni punti: cosa deve avere la prossima casa? Perché vuole cambiare? Entro quando vorrebbe acquistare? Qual è la fascia di budget sostenibile? Ha già verificato disponibilità o finanziamento? Chi partecipa alla decisione?",
    "roleplayClient": "Voglio prima vedere case.",
    "roleplayAgent": "Certo. Queste domande servono proprio a evitare visite inutili e concentrarci sulle case che può davvero scegliere.",
    "memory": [
      "Criteri",
      "motivazione",
      "tempo",
      "budget",
      "decisori",
      "processo finanziario."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Primo_Copione_Acquirenti.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "buyer",
      "prequalifica",
      "acquirente",
      "—",
      "prequalifica"
    ],
    "workflowPhase": 2,
    "workflowOrder": 243,
    "sentences": [
      "Per aiutarla bene devo capire alcuni punti: cosa deve avere la prossima casa?",
      "Perché vuole cambiare?",
      "Entro quando vorrebbe acquistare?",
      "Qual è la fascia di budget sostenibile?",
      "Ha già verificato disponibilità o finanziamento?",
      "Chi partecipa alla decisione?"
    ],
    "microSentences": [
      "Per aiutarla bene devo capire alcuni punti",
      "cosa deve avere la prossima casa?",
      "Perché vuole cambiare?",
      "Entro quando vorrebbe acquistare?",
      "Qual è la fascia di budget sostenibile?",
      "Ha già verificato disponibilità o finanziamento?",
      "Chi partecipa alla decisione?"
    ],
    "keywords": [
      "CRITERI",
      "MOTIVAZIONE",
      "TEMPO",
      "BUDGET",
      "DECISORI",
      "PROCESSO FINANZIARIO",
      "BUYER"
    ],
    "memoryMap": [
      "MOTIVAZIONE",
      "REQUISITI",
      "DECISORI",
      "CAPACITÀ",
      "PROSSIMO PASSO"
    ],
    "objections": [
      "Voglio prima vedere case."
    ],
    "followUps": [
      "Certo. Queste domande servono proprio a evitare visite inutili e concentrarci sulle case che può davvero scegliere."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "buyer-offerta",
    "category": "BUYER",
    "subcategory": "Offerta",
    "title": "Acquirente — preparare l'offerta",
    "purpose": "Portare l'acquirente da interesse a decisione consapevole.",
    "usage": "Quando l'acquirente mostra interesse concreto.",
    "italianAdapted": "Da quello che mi ha detto, questa casa risponde ai criteri principali. Cosa le impedisce di formulare una proposta oggi? Se il punto è il prezzo o una condizione specifica, possiamo definirla chiaramente nell'offerta e lasciare che sia il venditore a rispondere.",
    "roleplayClient": "Ho paura di pagare troppo.",
    "roleplayAgent": "Comprensibile. Confrontiamo dati, condizioni e alternative; poi definiamo un'offerta che lei è disposto a sostenere.",
    "memory": [
      "Isola il freno",
      "usa dati",
      "nessuna pressione irragionevole."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "buyer",
      "offerta",
      "acquirente",
      "—",
      "preparare",
      "l'offerta"
    ],
    "workflowPhase": 2,
    "workflowOrder": 244,
    "sentences": [
      "Da quello che mi ha detto, questa casa risponde ai criteri principali.",
      "Cosa le impedisce di formulare una proposta oggi?",
      "Se il punto è il prezzo o una condizione specifica, possiamo definirla chiaramente nell'offerta e lasciare che sia il venditore a rispondere."
    ],
    "microSentences": [
      "Da quello che mi ha detto",
      "questa casa risponde ai criteri principali.",
      "Cosa le impedisce di formulare una proposta oggi?",
      "Se il punto è il prezzo o una condizione specifica",
      "possiamo definirla chiaramente nell'offerta e lasciare che sia il venditore a rispondere."
    ],
    "keywords": [
      "ISOLA IL FRENO",
      "USA DATI",
      "NESSUNA PRESSIONE IRRAGIONEVOLE",
      "BUYER",
      "OFFERTA",
      "ACQUIRENTE",
      "PREPARARE"
    ],
    "memoryMap": [
      "MOTIVAZIONE",
      "REQUISITI",
      "DECISORI",
      "CAPACITÀ",
      "PROSSIMO PASSO"
    ],
    "objections": [
      "Ho paura di pagare troppo."
    ],
    "followUps": [
      "Comprensibile. Confrontiamo dati, condizioni e alternative; poi definiamo un'offerta che lei è disposto a sostenere."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "presenting-offer",
    "category": "BUYER",
    "subcategory": "Offerta",
    "title": "Presentare un'offerta al venditore",
    "purpose": "Presentare un'offerta come insieme di prezzo e condizioni, non solo cifra.",
    "usage": "Quando arriva una proposta scritta.",
    "italianAdapted": "Abbiamo ricevuto una proposta. Prima di reagire al prezzo, guardiamo l'intero pacchetto: cifra, tempi, eventuale finanziamento, condizioni, deposito, richieste e data prevista. Poi decidiamo se accettare, rifiutare o controproporre sulla base del suo obiettivo.",
    "roleplayClient": "Il prezzo è troppo basso.",
    "roleplayAgent": "Può essere. Prima quantifichiamo la distanza e verifichiamo se condizioni e affidabilità compensano qualcosa; poi costruiamo la controproposta.",
    "memory": [
      "Valuta pacchetto completo",
      "separa emozione da decisione."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "buyer",
      "offerta",
      "presentare",
      "un'offerta",
      "al",
      "venditore"
    ],
    "workflowPhase": 2,
    "workflowOrder": 254,
    "sentences": [
      "Abbiamo ricevuto una proposta.",
      "Prima di reagire al prezzo, guardiamo l'intero pacchetto: cifra, tempi, eventuale finanziamento, condizioni, deposito, richieste e data prevista.",
      "Poi decidiamo se accettare, rifiutare o controproporre sulla base del suo obiettivo."
    ],
    "microSentences": [
      "Abbiamo ricevuto una proposta.",
      "Prima di reagire al prezzo",
      "guardiamo l'intero pacchetto",
      "eventuale finanziamento",
      "condizioni",
      "richieste e data prevista.",
      "Poi decidiamo se accettare",
      "rifiutare o controproporre sulla base del suo obiettivo."
    ],
    "keywords": [
      "VALUTA PACCHETTO COMPLETO",
      "SEPARA EMOZIONE DA DECISIONE",
      "BUYER",
      "OFFERTA",
      "PRESENTARE",
      "UN'OFFERTA",
      "VENDITORE"
    ],
    "memoryMap": [
      "MOTIVAZIONE",
      "REQUISITI",
      "DECISORI",
      "CAPACITÀ",
      "PROSSIMO PASSO"
    ],
    "objections": [
      "Il prezzo è troppo basso."
    ],
    "followUps": [
      "Può essere. Prima quantifichiamo la distanza e verifichiamo se condizioni e affidabilità compensano qualcosa; poi costruiamo la controproposta."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "qualifica-motivazione-buyer",
    "category": "BUYER",
    "subcategory": "Motivazione",
    "title": "Acquirente — motivazione",
    "purpose": "Capire quanto è reale e urgente il progetto d'acquisto.",
    "usage": "Prima di investire tempo in ricerca e visite.",
    "italianAdapted": "Cosa la spinge a comprare proprio adesso? Cosa succede se tra sei mesi è ancora nella situazione attuale? Chi altro partecipa alla decisione? E quando troveremo la casa giusta, sarà nelle condizioni di fare una proposta?",
    "roleplayClient": "Sto solo guardando.",
    "roleplayAgent": "Va benissimo. Allora definiamo cosa deve succedere perché da esplorazione passi a decisione, così le mando solo opportunità coerenti.",
    "memory": [
      "Motivazione",
      "costo del non agire",
      "decisori",
      "readiness."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Secondo_Copione_Acquirenti_prequalifica_motivazione.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "buyer",
      "motivazione",
      "acquirente",
      "—",
      "motivazione"
    ],
    "workflowPhase": 2,
    "workflowOrder": 255,
    "sentences": [
      "Cosa la spinge a comprare proprio adesso?",
      "Cosa succede se tra sei mesi è ancora nella situazione attuale?",
      "Chi altro partecipa alla decisione?",
      "E quando troveremo la casa giusta, sarà nelle condizioni di fare una proposta?"
    ],
    "microSentences": [
      "Cosa la spinge a comprare proprio adesso?",
      "Cosa succede se tra sei mesi è ancora nella situazione attuale?",
      "Chi altro partecipa alla decisione?",
      "E quando troveremo la casa giusta",
      "sarà nelle condizioni di fare una proposta?"
    ],
    "keywords": [
      "MOTIVAZIONE",
      "COSTO DEL NON AGIRE",
      "DECISORI",
      "READINESS",
      "BUYER",
      "ACQUIRENTE"
    ],
    "memoryMap": [
      "MOTIVAZIONE",
      "REQUISITI",
      "DECISORI",
      "CAPACITÀ",
      "PROSSIMO PASSO"
    ],
    "objections": [
      "Sto solo guardando."
    ],
    "followUps": [
      "Va benissimo. Allora definiamo cosa deve succedere perché da esplorazione passi a decisione, così le mando solo opportunità coerenti."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "followup-appuntamento",
    "category": "LEAD FOLLOW-UP",
    "subcategory": "Appuntamento",
    "title": "Follow-up dopo appuntamento",
    "purpose": "Ottenere una decisione o un prossimo passo chiaro.",
    "usage": "Dopo un incontro senza firma.",
    "italianAdapted": "Buongiorno [NOME], dopo il nostro incontro volevo capire cosa le è rimasto da chiarire prima di decidere. C'è un punto della strategia, del prezzo o delle condizioni che vuole rivedere?",
    "roleplayClient": "Stiamo valutando altre agenzie.",
    "roleplayAgent": "È corretto confrontare. Quali criteri userete per decidere? Se mi dice cosa conta di più, posso chiarire come lavorerei su quei punti.",
    "memory": [
      "Non inseguire",
      "scopri criteri",
      "chiedi next step."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "lead",
      "follow-up",
      "appuntamento",
      "follow-up",
      "dopo",
      "appuntamento"
    ],
    "workflowPhase": 2,
    "workflowOrder": 259,
    "sentences": [
      "Buongiorno [NOME], dopo il nostro incontro volevo capire cosa le è rimasto da chiarire prima di decidere.",
      "C'è un punto della strategia, del prezzo o delle condizioni che vuole rivedere?"
    ],
    "microSentences": [
      "Buongiorno [NOME]",
      "dopo il nostro incontro volevo capire cosa le è rimasto da chiarire prima di decidere.",
      "C'è un punto della strategia",
      "del prezzo o delle condizioni che vuole rivedere?"
    ],
    "keywords": [
      "NON INSEGUIRE",
      "SCOPRI CRITERI",
      "CHIEDI NEXT STEP",
      "LEAD",
      "FOLLOW-UP",
      "APPUNTAMENTO",
      "DOPO"
    ],
    "memoryMap": [
      "RICHIAMA",
      "RICORDA CONTESTO",
      "SCOPRI BLOCCO",
      "PROSSIMO PASSO",
      "DATA"
    ],
    "objections": [
      "Stiamo valutando altre agenzie."
    ],
    "followUps": [
      "È corretto confrontare. Quali criteri userete per decidere? Se mi dice cosa conta di più, posso chiarire come lavorerei su quei punti."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "followup-post-visita",
    "category": "LEAD FOLLOW-UP",
    "subcategory": "Feedback",
    "title": "Follow-up post visita",
    "purpose": "Trasformare feedback delle visite in informazione utile per venditore e buyer.",
    "usage": "Dopo una visita.",
    "italianAdapted": "Grazie per la visita. Quali sono le due cose che le sono piaciute di più? Qual è invece il principale motivo per cui oggi non farebbe una proposta? Se quel punto fosse risolto, l'immobile tornerebbe tra le sue prime scelte?",
    "roleplayClient": "Il prezzo.",
    "roleplayAgent": "Capito. Quale fascia renderebbe l'immobile competitivo per lei, considerando caratteristiche e alternative che ha visto?",
    "memory": [
      "Domande specifiche",
      "quantifica obiezione",
      "nessuna promessa."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "lead",
      "follow-up",
      "feedback",
      "follow-up",
      "post",
      "visita"
    ],
    "workflowPhase": 2,
    "workflowOrder": 260,
    "sentences": [
      "Grazie per la visita.",
      "Quali sono le due cose che le sono piaciute di più?",
      "Qual è invece il principale motivo per cui oggi non farebbe una proposta?",
      "Se quel punto fosse risolto, l'immobile tornerebbe tra le sue prime scelte?"
    ],
    "microSentences": [
      "Grazie per la visita.",
      "Quali sono le due cose che le sono piaciute di più?",
      "Qual è invece il principale motivo per cui oggi non farebbe una proposta?",
      "Se quel punto fosse risolto",
      "l'immobile tornerebbe tra le sue prime scelte?"
    ],
    "keywords": [
      "DOMANDE SPECIFICHE",
      "QUANTIFICA OBIEZIONE",
      "NESSUNA PROMESSA",
      "LEAD",
      "FOLLOW-UP",
      "FEEDBACK",
      "POST"
    ],
    "memoryMap": [
      "RICHIAMA",
      "RICORDA CONTESTO",
      "SCOPRI BLOCCO",
      "PROSSIMO PASSO",
      "DATA"
    ],
    "objections": [
      "Il prezzo."
    ],
    "followUps": [
      "Capito. Quale fascia renderebbe l'immobile competitivo per lei, considerando caratteristiche e alternative che ha visto?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 3,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Prima di vederci vorrei farle alcune domande, così arriviamo all'incontro preparati.",
      "Se quello che le mostrerò avrà senso e si sentirà a suo agio nel lavorare con me, sarà disposto a valutare l'incarico?",
      "Parlerà anche con altri agenti?",
      "Dopo la vendita, dove pensa di trasferirsi e entro quando deve essere lì?",
      "Quale prezzo ha in mente per la messa in vendita e qual è il limite sotto il quale oggi non vorrebbe scendere?",
      "C'è un mutuo o altro debito residuo sull'immobile?",
      "Ha preso in considerazione la vendita da privato?",
      "Mi descrive brevemente casa, stato, punti di forza e lavori da fare?",
      "Chi deve essere presente alla decisione?",
      "Prima dell'incontro le invierò il materiale informativo: può leggerlo?",
      "Ha domande da farmi ora?",
      "Bene: confermiamo giorno e ora e la ricontatterò per la conferma finale."
    ],
    "microSentences": [
      "Prima di vederci vorrei farle alcune domande",
      "così arriviamo all'incontro preparati.",
      "Se quello che le mostrerò avrà senso e si sentirà a suo agio nel lavorare con me",
      "sarà disposto a valutare l'incarico?",
      "Parlerà anche con altri agenti?",
      "Dopo la vendita",
      "dove pensa di trasferirsi e entro quando deve essere lì?",
      "Quale prezzo ha in mente per la messa in vendita e qual è il limite sotto il quale oggi non vorrebbe scendere?",
      "C'è un mutuo o altro debito residuo sull'immobile?",
      "Ha preso in considerazione la vendita da privato?",
      "Mi descrive brevemente casa",
      "punti di forza e lavori da fare?",
      "Chi deve essere presente alla decisione?",
      "Prima dell'incontro le invierò il materiale informativo",
      "può leggerlo?",
      "Ha domande da farmi ora?",
      "confermiamo giorno e ora e la ricontatterò per la conferma finale."
    ],
    "id": "acq-03-prequalifica-completa",
    "workflowPhase": 3,
    "workflowOrder": 300,
    "subcategory": "03 · Prequalifica",
    "title": "Prequalifica venditore — sequenza completa",
    "purpose": "Arrivare all'appuntamento conoscendo decisione, concorrenza, trasferimento, tempi, prezzo, debito residuo, tentativo da privato e caratteristiche dell'immobile.",
    "usage": "Sempre prima dell'appuntamento di acquisizione.",
    "italianAdapted": "Prima di vederci vorrei farle alcune domande, così arriviamo all'incontro preparati. Se quello che le mostrerò avrà senso e si sentirà a suo agio nel lavorare con me, sarà disposto a valutare l'incarico? Parlerà anche con altri agenti? Dopo la vendita, dove pensa di trasferirsi e entro quando deve essere lì? Quale prezzo ha in mente per la messa in vendita e qual è il limite sotto il quale oggi non vorrebbe scendere? C'è un mutuo o altro debito residuo sull'immobile? Ha preso in considerazione la vendita da privato? Mi descrive brevemente casa, stato, punti di forza e lavori da fare? Chi deve essere presente alla decisione? Prima dell'incontro le invierò il materiale informativo: può leggerlo? Ha domande da farmi ora? Bene: confermiamo giorno e ora e la ricontatterò per la conferma finale.",
    "roleplayClient": "Vorrei sentire anche altre agenzie.",
    "roleplayAgent": "È corretto confrontare. Mi aiuta sapere con quante persone parlerà e quali criteri userete per scegliere, così preparo l'incontro sui punti che per voi contano davvero.",
    "keywords": [
      "DECISIONE",
      "ALTRI AGENTI",
      "TRASFERIMENTO",
      "TEMPI",
      "PREZZO",
      "DEBITO",
      "PRIVATO"
    ],
    "memoryMap": [
      "DISPONIBILITÀ A DECIDERE",
      "CONCORRENZA",
      "DOVE",
      "QUANDO",
      "PREZZO",
      "DEBITO",
      "PRIVATO",
      "IMMOBILE",
      "DECISORI",
      "MATERIALE",
      "DOMANDE",
      "CONFERMA"
    ],
    "objections": [
      "Parlo con altre agenzie",
      "Non so ancora il prezzo",
      "Potrei vendere da solo"
    ],
    "followUps": [
      "Quali criteri userà per decidere?",
      "Chi deve essere presente?",
      "Confermiamo giorno e ora."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_prequalifica_venditore.pdf"
  },
  {
    "id": "prequalifica-motivazione",
    "category": "PREQUALIFICATION",
    "subcategory": "Motivazione",
    "title": "Prequalifica — motivazione",
    "purpose": "Comprendere il vero motivo e il costo del non agire.",
    "usage": "Durante la prequalifica.",
    "italianAdapted": "Mi aiuta a capire perché sta valutando di vendere proprio adesso? Cosa succede se non riesce a vendere nei tempi che ha in mente? E qual è per lei il risultato ideale?",
    "roleplayClient": "Non ho una scadenza precisa.",
    "roleplayAgent": "Va bene. Allora capire il motivo principale diventa ancora più importante: cosa dovrebbe cambiare perché la vendita diventi una priorità?",
    "memory": [
      "Non accontentarti di motivazioni superficiali",
      "evita interrogatorio",
      "ascolta."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_prequalifica_venditore.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prequalification",
      "motivazione",
      "prequalifica",
      "—",
      "motivazione"
    ],
    "workflowPhase": 3,
    "workflowOrder": 320,
    "sentences": [
      "Mi aiuta a capire perché sta valutando di vendere proprio adesso?",
      "Cosa succede se non riesce a vendere nei tempi che ha in mente?",
      "E qual è per lei il risultato ideale?"
    ],
    "microSentences": [
      "Mi aiuta a capire perché sta valutando di vendere proprio adesso?",
      "Cosa succede se non riesce a vendere nei tempi che ha in mente?",
      "E qual è per lei il risultato ideale?"
    ],
    "keywords": [
      "NON ACCONTENTARTI DI MOTIVAZIONI SUPERFICIALI",
      "EVITA INTERROGATORIO",
      "ASCOLTA",
      "PREQUALIFICATION",
      "MOTIVAZIONE",
      "PREQUALIFICA"
    ],
    "memoryMap": [
      "PERMESSO",
      "MOTIVAZIONE",
      "TEMPI",
      "PREZZO",
      "DECISORI",
      "OSTACOLI",
      "CONFERMA APPUNTAMENTO"
    ],
    "objections": [
      "Non ho una scadenza precisa."
    ],
    "followUps": [
      "Va bene. Allora capire il motivo principale diventa ancora più importante: cosa dovrebbe cambiare perché la vendita diventi una priorità?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "CORRETTO NELL'AUDIT 2026-09-19",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "prequalifica-venditore",
    "category": "PREQUALIFICATION",
    "subcategory": "Venditore",
    "title": "Prequalifica venditore",
    "purpose": "Capire motivazione, tempistica, prezzo e processo decisionale prima dell'appuntamento.",
    "usage": "Prima della listing presentation.",
    "italianAdapted": "Prima di incontrarci vorrei farle alcune domande, così preparo un incontro utile. Perché sta pensando di vendere? Dove andrà dopo? Entro quando deve essere trasferito? A che prezzo pensa che l'immobile dovrebbe essere proposto? Chi partecipa alla decisione? Sta parlando con altri agenti?",
    "roleplayClient": "Preferisco parlarne di persona.",
    "roleplayAgent": "Certamente. Mi bastano alcune informazioni essenziali per arrivare preparato e non farle perdere tempo.",
    "memory": [
      "Motivazione",
      "destinazione",
      "tempistica",
      "prezzo",
      "decisori",
      "concorrenza."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_prequalifica_venditore.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "prequalification",
      "venditore",
      "prequalifica",
      "venditore"
    ],
    "workflowPhase": 3,
    "workflowOrder": 320,
    "sentences": [
      "Prima di incontrarci vorrei farle alcune domande, così preparo un incontro utile.",
      "Perché sta pensando di vendere?",
      "Dove andrà dopo?",
      "Entro quando deve essere trasferito?",
      "A che prezzo pensa che l'immobile dovrebbe essere proposto?",
      "Chi partecipa alla decisione?",
      "Sta parlando con altri agenti?"
    ],
    "microSentences": [
      "Prima di incontrarci vorrei farle alcune domande",
      "così preparo un incontro utile.",
      "Perché sta pensando di vendere?",
      "Dove andrà dopo?",
      "Entro quando deve essere trasferito?",
      "A che prezzo pensa che l'immobile dovrebbe essere proposto?",
      "Chi partecipa alla decisione?",
      "Sta parlando con altri agenti?"
    ],
    "keywords": [
      "MOTIVAZIONE",
      "DESTINAZIONE",
      "TEMPISTICA",
      "PREZZO",
      "DECISORI",
      "CONCORRENZA",
      "PREQUALIFICATION"
    ],
    "memoryMap": [
      "PERMESSO",
      "MOTIVAZIONE",
      "TEMPI",
      "PREZZO",
      "DECISORI",
      "OSTACOLI",
      "CONFERMA APPUNTAMENTO"
    ],
    "objections": [
      "Preferisco parlarne di persona."
    ],
    "followUps": [
      "Certamente. Mi bastano alcune informazioni essenziali per arrivare preparato e non farle perdere tempo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "RIFERIMENTO UFFICIALE - TESTO F1 ADATTATO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "prequalifica-decisori",
    "category": "PREQUALIFICATION",
    "subcategory": "Decisori",
    "title": "Prequalifica — decisori",
    "purpose": "Assicurare che le persone necessarie siano presenti all'incontro.",
    "usage": "Prima dell'appuntamento.",
    "italianAdapted": "Per evitare di dover ripetere tutto due volte: chi, oltre a lei, partecipa alla decisione di vendere? È possibile che sia presente anche quella persona quando ci vediamo?",
    "roleplayClient": "Decido io, poi ne parlo con mia moglie.",
    "roleplayAgent": "Capisco. Proprio per rispettare entrambi, è meglio che ascoltiate le stesse informazioni nello stesso momento.",
    "memory": [
      "Identifica decisori",
      "non creare conflitto",
      "ottieni presenza congiunta."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_prequalifica_venditore.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "prequalification",
      "decisori",
      "prequalifica",
      "—",
      "decisori"
    ],
    "workflowPhase": 3,
    "workflowOrder": 340,
    "sentences": [
      "Per evitare di dover ripetere tutto due volte: chi, oltre a lei, partecipa alla decisione di vendere?",
      "È possibile che sia presente anche quella persona quando ci vediamo?"
    ],
    "microSentences": [
      "Per evitare di dover ripetere tutto due volte",
      "oltre a lei",
      "partecipa alla decisione di vendere?",
      "È possibile che sia presente anche quella persona quando ci vediamo?"
    ],
    "keywords": [
      "IDENTIFICA DECISORI",
      "NON CREARE CONFLITTO",
      "OTTIENI PRESENZA CONGIUNTA",
      "PREQUALIFICATION",
      "DECISORI",
      "PREQUALIFICA"
    ],
    "memoryMap": [
      "PERMESSO",
      "MOTIVAZIONE",
      "TEMPI",
      "PREZZO",
      "DECISORI",
      "OSTACOLI",
      "CONFERMA APPUNTAMENTO"
    ],
    "objections": [
      "Decido io, poi ne parlo con mia moglie."
    ],
    "followUps": [
      "Capisco. Proprio per rispettare entrambi, è meglio che ascoltiate le stesse informazioni nello stesso momento."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "CORRETTO NELL'AUDIT 2026-09-19",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Da quello che mi ha detto, ha senso incontrarci e verificare valore, strategia e tempi.",
      "Preferisce [GIORNO A] alle [ORA] oppure [GIORNO B] alle [ORA]?",
      "Vorrei che fossero presenti tutte le persone che partecipano alla decisione.",
      "Le invierò prima il materiale da leggere, così all'incontro andiamo subito ai punti importanti."
    ],
    "microSentences": [
      "Da quello che mi ha detto",
      "ha senso incontrarci e verificare valore",
      "strategia e tempi.",
      "Preferisce [GIORNO A] alle [ORA] oppure [GIORNO B] alle [ORA]?",
      "Vorrei che fossero presenti tutte le persone che partecipano alla decisione.",
      "Le invierò prima il materiale da leggere",
      "così all'incontro andiamo subito ai punti importanti."
    ],
    "id": "acq-04-fissare-appuntamento",
    "workflowPhase": 4,
    "workflowOrder": 400,
    "subcategory": "04 · Appuntamento",
    "title": "Fissare l'appuntamento di acquisizione",
    "purpose": "Trasformare una conversazione qualificata in un incontro con tutti i decisori.",
    "usage": "Dopo qualifica o prequalifica positiva.",
    "italianAdapted": "Da quello che mi ha detto, ha senso incontrarci e verificare valore, strategia e tempi. Preferisce [GIORNO A] alle [ORA] oppure [GIORNO B] alle [ORA]? Vorrei che fossero presenti tutte le persone che partecipano alla decisione. Le invierò prima il materiale da leggere, così all'incontro andiamo subito ai punti importanti.",
    "roleplayClient": "Mi richiami la prossima settimana.",
    "roleplayAgent": "Volentieri. Prima fissiamo già un momento preciso, così non ci inseguiamo: martedì o mercoledì quale funziona meglio?",
    "keywords": [
      "DUE OPZIONI",
      "DECISORI",
      "MATERIALE",
      "CONFERMA"
    ],
    "memoryMap": [
      "VALORE",
      "DUE ORARI",
      "DECISORI",
      "MATERIALE",
      "CONFERMA"
    ],
    "objections": [
      "Richiamami",
      "Non so quando"
    ],
    "followUps": [
      "Martedì o mercoledì?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/setting-more-qualified-appointments/"
  },
  {
    "id": "appointment-direct",
    "category": "APPOINTMENT SETTING",
    "subcategory": "Chiusura",
    "title": "Chiusura appuntamento diretta",
    "purpose": "Convertire interesse in data e ora precise.",
    "usage": "Quando esiste un motivo sufficiente per incontrarsi.",
    "italianAdapted": "Da quello che mi ha detto, credo abbia senso guardarci insieme per quindici o venti minuti. Per lei è più comodo oggi nel tardo pomeriggio o domani?",
    "roleplayClient": "Non so i miei orari.",
    "roleplayAgent": "Nessun problema. Qual è la prima fascia in cui sa di essere libero? Fissiamo quella e, se cambia qualcosa, ci aggiorniamo.",
    "memory": [
      "Due alternative",
      "data e ora",
      "riduci ambiguità."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "appointment",
      "setting",
      "chiusura",
      "chiusura",
      "appuntamento",
      "diretta"
    ],
    "workflowPhase": 4,
    "workflowOrder": 446,
    "sentences": [
      "Da quello che mi ha detto, credo abbia senso guardarci insieme per quindici o venti minuti.",
      "Per lei è più comodo oggi nel tardo pomeriggio o domani?"
    ],
    "microSentences": [
      "Da quello che mi ha detto",
      "credo abbia senso guardarci insieme per quindici o venti minuti.",
      "Per lei è più comodo oggi nel tardo pomeriggio o domani?"
    ],
    "keywords": [
      "DUE ALTERNATIVE",
      "DATA E ORA",
      "RIDUCI AMBIGUITÀ",
      "APPOINTMENT",
      "SETTING",
      "CHIUSURA",
      "APPUNTAMENTO"
    ],
    "memoryMap": [
      "VALORE",
      "TEMPO",
      "DUE OPZIONI",
      "CONFERMA",
      "PREPARA"
    ],
    "objections": [
      "Non so i miei orari."
    ],
    "followUps": [
      "Nessun problema. Qual è la prima fascia in cui sa di essere libero? Fissiamo quella e, se cambia qualcosa, ci aggiorniamo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "appointment-no-decision",
    "category": "APPOINTMENT SETTING",
    "subcategory": "Micro-impegno",
    "title": "Appuntamento senza decisione",
    "purpose": "Ridurre la resistenza chiarendo che l'incontro serve a valutare.",
    "usage": "Quando il prospect teme di essere pressato.",
    "italianAdapted": "L'incontro non la obbliga a vendere né a firmare. Serve a capire valore, strategia e tempi. Alla fine deciderà se ha senso fare un passo successivo. Possiamo fissarlo per [GIORNO]?",
    "roleplayClient": "Non voglio perdere tempo.",
    "roleplayAgent": "È proprio per evitarlo che lo teniamo breve e concreto: dati, piano e decisione se continuare o meno.",
    "memory": [
      "Riduci rischio",
      "chiarisci scopo",
      "chiedi data."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "appointment",
      "setting",
      "micro-impegno",
      "appuntamento",
      "senza",
      "decisione"
    ],
    "workflowPhase": 4,
    "workflowOrder": 447,
    "sentences": [
      "L'incontro non la obbliga a vendere né a firmare.",
      "Serve a capire valore, strategia e tempi.",
      "Alla fine deciderà se ha senso fare un passo successivo.",
      "Possiamo fissarlo per [GIORNO]?"
    ],
    "microSentences": [
      "L'incontro non la obbliga a vendere né a firmare.",
      "Serve a capire valore",
      "strategia e tempi.",
      "Alla fine deciderà se ha senso fare un passo successivo.",
      "Possiamo fissarlo per [GIORNO]?"
    ],
    "keywords": [
      "RIDUCI RISCHIO",
      "CHIARISCI SCOPO",
      "CHIEDI DATA",
      "APPOINTMENT",
      "SETTING",
      "MICRO-IMPEGNO",
      "APPUNTAMENTO"
    ],
    "memoryMap": [
      "VALORE",
      "TEMPO",
      "DUE OPZIONI",
      "CONFERMA",
      "PREPARA"
    ],
    "objections": [
      "Non voglio perdere tempo."
    ],
    "followUps": [
      "È proprio per evitarlo che lo teniamo breve e concreto: dati, piano e decisione se continuare o meno."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Prima di uscire verifico cinque elementi: motivazione e scadenza del venditore; tutti i decisori; prezzo desiderato e possibile scostamento dai dati; comparabili e prove di mercato; obiezioni già emerse durante la prequalifica.",
      "Preparo una risposta breve per ciascuna obiezione e decido quale domanda userò per riportare la conversazione alla decisione."
    ],
    "microSentences": [
      "Prima di uscire verifico cinque elementi",
      "motivazione e scadenza del venditore",
      "tutti i decisori",
      "prezzo desiderato e possibile scostamento dai dati",
      "comparabili e prove di mercato",
      "obiezioni già emerse durante la prequalifica.",
      "Preparo una risposta breve per ciascuna obiezione e decido quale domanda userò per riportare la conversazione alla decisione."
    ],
    "id": "acq-05-preparare-appuntamento",
    "workflowPhase": 5,
    "workflowOrder": 500,
    "subcategory": "05 · Preparazione",
    "title": "Preparare l'appuntamento",
    "purpose": "Arrivare con prequalifica, comparabili, piano e obiezioni previste già organizzati.",
    "usage": "Prima di partire per l'appuntamento.",
    "italianAdapted": "Prima di uscire verifico cinque elementi: motivazione e scadenza del venditore; tutti i decisori; prezzo desiderato e possibile scostamento dai dati; comparabili e prove di mercato; obiezioni già emerse durante la prequalifica. Preparo una risposta breve per ciascuna obiezione e decido quale domanda userò per riportare la conversazione alla decisione.",
    "roleplayClient": "",
    "roleplayAgent": "",
    "keywords": [
      "MOTIVAZIONE",
      "DECISORI",
      "PREZZO",
      "COMPARABILI",
      "OBIEZIONI"
    ],
    "memoryMap": [
      "PREQUALIFICA",
      "DATI",
      "CMA",
      "OBIEZIONI",
      "OBIETTIVO"
    ],
    "objections": [],
    "followUps": [],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/5-steps-to-improve-your-listing-presentation/"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Grazie per avermi ricevuto.",
      "Prima di sederci, facciamo un giro rapido così collego ciò che mi ha raccontato al telefono con l'immobile reale.",
      "Mi segnalerà lei eventuali lavori recenti o caratteristiche che considera particolarmente importanti.",
      "Poi ci sediamo e affrontiamo insieme decisione, prezzo e piano."
    ],
    "microSentences": [
      "Grazie per avermi ricevuto.",
      "Prima di sederci",
      "facciamo un giro rapido così collego ciò che mi ha raccontato al telefono con l'immobile reale.",
      "Mi segnalerà lei eventuali lavori recenti o caratteristiche che considera particolarmente importanti.",
      "Poi ci sediamo e affrontiamo insieme decisione",
      "prezzo e piano."
    ],
    "id": "acq-06-arrivo-casa",
    "workflowPhase": 6,
    "workflowOrder": 600,
    "subcategory": "06 · Arrivo a casa",
    "title": "Arrivo a casa del cliente",
    "purpose": "Entrare con professionalità, vedere rapidamente l'immobile e portare la conversazione al tavolo.",
    "usage": "Primi minuti dell'appuntamento.",
    "italianAdapted": "Grazie per avermi ricevuto. Prima di sederci, facciamo un giro rapido così collego ciò che mi ha raccontato al telefono con l'immobile reale. Mi segnalerà lei eventuali lavori recenti o caratteristiche che considera particolarmente importanti. Poi ci sediamo e affrontiamo insieme decisione, prezzo e piano.",
    "roleplayClient": "Le faccio vedere tutto con calma, ci vorrà un po'.",
    "roleplayAgent": "Volentieri. Per rispettare il suo tempo facciamo prima un giro sintetico, poi approfondiamo al tavolo ciò che incide davvero su prezzo e vendita.",
    "keywords": [
      "RINGRAZIA",
      "GIRO RAPIDO",
      "PUNTI FORTI",
      "TAVOLO"
    ],
    "memoryMap": [
      "SALUTO",
      "GIRO",
      "OSSERVA",
      "TRANSIZIONE AL TAVOLO"
    ],
    "objections": [
      "Visita molto lunga"
    ],
    "followUps": [
      "Sediamoci e partiamo dai punti decisivi."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Grazie ancora per il tempo.",
      "Vorrei tenere l'incontro semplice: prima confermiamo ciò che mi ha detto al telefono, poi guardiamo motivazione e prezzo, quindi il piano di vendita.",
      "Alla fine capiremo se ha senso lavorare insieme.",
      "Va bene procedere così?"
    ],
    "microSentences": [
      "Grazie ancora per il tempo.",
      "Vorrei tenere l'incontro semplice",
      "prima confermiamo ciò che mi ha detto al telefono",
      "poi guardiamo motivazione e prezzo",
      "quindi il piano di vendita.",
      "Alla fine capiremo se ha senso lavorare insieme.",
      "Va bene procedere così?"
    ],
    "id": "lp-01-apertura",
    "workflowPhase": 7,
    "workflowOrder": 700,
    "subcategory": "07 · Apertura",
    "title": "LP-01 · Apertura della presentazione",
    "purpose": "Impostare l'incontro su domande, dati e decisione.",
    "usage": "Appena seduti al tavolo.",
    "italianAdapted": "Grazie ancora per il tempo. Vorrei tenere l'incontro semplice: prima confermiamo ciò che mi ha detto al telefono, poi guardiamo motivazione e prezzo, quindi il piano di vendita. Alla fine capiremo se ha senso lavorare insieme. Va bene procedere così?",
    "roleplayClient": "Sì.",
    "roleplayAgent": "Perfetto. Partiamo da ciò che mi aveva anticipato al telefono.",
    "keywords": [
      "AGENDA",
      "CONFERMA",
      "MOTIVAZIONE",
      "PREZZO",
      "PIANO"
    ],
    "memoryMap": [
      "RINGRAZIA",
      "SPIEGA AGENDA",
      "CHIEDI ACCORDO",
      "PARTI"
    ],
    "objections": [],
    "followUps": [
      "Partiamo dalla prequalifica."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf"
  },
  {
    "id": "listing-apertura",
    "category": "LISTING PRESENTATION",
    "subcategory": "Apertura",
    "title": "Presentazione acquisizione — apertura",
    "purpose": "Impostare un incontro strutturato e orientato alla decisione.",
    "usage": "All'inizio dell'appuntamento venditore.",
    "italianAdapted": "Grazie per avermi ricevuto. Prima di entrare nei dettagli, confermiamo l'agenda: rivediamo ciò che mi ha detto al telefono, poi motivazione e prezzo, quindi il piano. Alla fine decideremo se ci sono le condizioni per lavorare insieme.",
    "roleplayClient": "Sì.",
    "roleplayAgent": "Perfetto. Inizio da lei: qual è la cosa più importante che deve ottenere da questa vendita?",
    "memory": [
      "Definisci agenda",
      "ottieni accordo",
      "parti dalla motivazione."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "apertura",
      "presentazione",
      "acquisizione",
      "—",
      "apertura"
    ],
    "workflowPhase": 7,
    "workflowOrder": 705,
    "sentences": [
      "Grazie per avermi ricevuto.",
      "Prima di entrare nei dettagli, confermiamo l'agenda: rivediamo ciò che mi ha detto al telefono, poi motivazione e prezzo, quindi il piano.",
      "Alla fine decideremo se ci sono le condizioni per lavorare insieme."
    ],
    "microSentences": [
      "Grazie per il tempo.",
      "Vorrei fare tre cose",
      "capire esattamente il suo obiettivo",
      "mostrarle come lavorerei per raggiungerlo e definire insieme prezzo e strategia.",
      "Se alla fine ciò che le propongo avrà senso",
      "potremo decidere di partire."
    ],
    "keywords": [
      "AGENDA",
      "PREQUALIFICA",
      "MOTIVAZIONE",
      "PREZZO",
      "PIANO"
    ],
    "memoryMap": [
      "AGENDA",
      "CONFERMA",
      "TRANSIZIONE"
    ],
    "objections": [
      "Sì."
    ],
    "followUps": [
      "Perfetto. Inizio da lei: qual è la cosa più importante che deve ottenere da questa vendita?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "CORRETTO NELL'AUDIT 2026-09-19",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 3,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Prima di entrare nei numeri, vorrei essere chiaro su come può finire questo incontro.",
      "Potrà decidere di affidarmi l'incarico; potrà decidere di non affidarmelo; oppure potrei essere io a ritenere che non ci siano le condizioni corrette per accettarlo.",
      "Tutte e tre le conclusioni vanno bene, purché siano basate sui fatti.",
      "Possiamo lavorare così?"
    ],
    "microSentences": [
      "Prima di entrare nei numeri",
      "vorrei essere chiaro su come può finire questo incontro.",
      "Potrà decidere di affidarmi l'incarico",
      "potrà decidere di non affidarmelo",
      "oppure potrei essere io a ritenere che non ci siano le condizioni corrette per accettarlo.",
      "Tutte e tre le conclusioni vanno bene",
      "purché siano basate sui fatti.",
      "Possiamo lavorare così?"
    ],
    "id": "lp-02-tre-risultati",
    "workflowPhase": 7,
    "workflowOrder": 710,
    "subcategory": "07 · Apertura",
    "title": "LP-02 · I tre possibili risultati",
    "purpose": "Togliere ambiguità e pressione chiarendo i tre possibili esiti dell'incontro.",
    "usage": "All'inizio della Listing/CMA Presentation.",
    "italianAdapted": "Prima di entrare nei numeri, vorrei essere chiaro su come può finire questo incontro. Potrà decidere di affidarmi l'incarico; potrà decidere di non affidarmelo; oppure potrei essere io a ritenere che non ci siano le condizioni corrette per accettarlo. Tutte e tre le conclusioni vanno bene, purché siano basate sui fatti. Possiamo lavorare così?",
    "roleplayClient": "Quindi potrebbe anche non prendere l'incarico?",
    "roleplayAgent": "Esatto. Il mio obiettivo non è prendere qualunque incarico, ma verificare se possiamo lavorare con condizioni che rendano realistico raggiungere il suo obiettivo.",
    "keywords": [
      "TRE ESITI",
      "NESSUNA PRESSIONE",
      "FATTI",
      "CONDIZIONI"
    ],
    "memoryMap": [
      "PREMESSA",
      "1 AFFIDA",
      "2 NON AFFIDA",
      "3 NON ACCETTO",
      "TUTTO VA BENE",
      "ACCORDO"
    ],
    "objections": [
      "Potrebbe non prendere l'incarico?"
    ],
    "followUps": [
      "Possiamo procedere così?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/02%2027%202023%20CMA%20Presentation%20Script.pdf"
  },
  {
    "id": "listing-one-minute",
    "category": "LISTING PRESENTATION",
    "subcategory": "Sintesi",
    "title": "Presentazione in un minuto — versione F1",
    "purpose": "Spiegare rapidamente perché il proprietario dovrebbe lavorare con l'agente.",
    "usage": "Quando serve una presentazione molto breve.",
    "italianAdapted": "Il mio lavoro è aiutarla a prendere tre decisioni corrette: prezzo, strategia e negoziazione. Le porto dati, creo esposizione qualificata, filtro le richieste, le comunico ciò che il mercato ci sta dicendo e negozio per proteggere il suo risultato. Se questo è il tipo di servizio che cerca, possiamo definire insieme il piano e partire.",
    "roleplayClient": "Cosa fa di diverso?",
    "roleplayAgent": "Rendo il processo misurabile e la tengo nelle condizioni di decidere sui fatti, non sulle speranze.",
    "memory": [
      "Sintesi di valore",
      "processo",
      "responsabilità."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://mikeferryitaly.com/wp-content/uploads/2022/04/MikeFerryItaly-Copione_per_presentazione_da_un_minuto.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "listing",
      "presentation",
      "sintesi",
      "presentazione",
      "in",
      "un",
      "minuto",
      "—",
      "versione",
      "f1"
    ],
    "workflowPhase": 7,
    "workflowOrder": 720,
    "sentences": [
      "Il mio lavoro è aiutarla a prendere tre decisioni corrette: prezzo, strategia e negoziazione.",
      "Le porto dati, creo esposizione qualificata, filtro le richieste, le comunico ciò che il mercato ci sta dicendo e negozio per proteggere il suo risultato.",
      "Se questo è il tipo di servizio che cerca, possiamo definire insieme il piano e partire."
    ],
    "microSentences": [
      "Il mio lavoro è aiutarla a prendere tre decisioni corrette",
      "strategia e negoziazione.",
      "Le porto dati",
      "creo esposizione qualificata",
      "filtro le richieste",
      "le comunico ciò che il mercato ci sta dicendo e negozio per proteggere il suo risultato.",
      "Se questo è il tipo di servizio che cerca",
      "possiamo definire insieme il piano e partire."
    ],
    "keywords": [
      "SINTESI DI VALORE",
      "PROCESSO",
      "RESPONSABILITÀ",
      "LISTING",
      "PRESENTATION",
      "SINTESI",
      "PRESENTAZIONE"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Cosa fa di diverso?"
    ],
    "followUps": [
      "Rendo il processo misurabile e la tengo nelle condizioni di decidere sui fatti, non sulle speranze."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "CORRETTO NELL'AUDIT 2026-09-19",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-piano",
    "category": "LISTING PRESENTATION",
    "subcategory": "Piano d'azione",
    "title": "Piano di vendita",
    "purpose": "Presentare un piano concreto e verificabile.",
    "usage": "Durante la listing presentation.",
    "italianAdapted": "Il mio lavoro è creare esposizione qualificata, generare contatti, filtrare gli acquirenti, ottenere feedback, negoziare e aggiornarla con regolarità. Ogni settimana confronteremo attività e risposta del mercato. Se i dati ci dicono che qualcosa non funziona, prenderemo una decisione insieme.",
    "roleplayClient": "Come faccio a sapere che farà davvero tutto?",
    "roleplayAgent": "Lo rendiamo verificabile: attività previste, aggiornamenti concordati e risultati misurabili.",
    "memory": [
      "Vendere processo, non promesse",
      "misurabilità",
      "comunicazione periodica."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "piano",
      "d'azione",
      "piano",
      "di",
      "vendita"
    ],
    "workflowPhase": 7,
    "workflowOrder": 724,
    "sentences": [
      "Il mio lavoro è creare esposizione qualificata, generare contatti, filtrare gli acquirenti, ottenere feedback, negoziare e aggiornarla con regolarità.",
      "Ogni settimana confronteremo attività e risposta del mercato.",
      "Se i dati ci dicono che qualcosa non funziona, prenderemo una decisione insieme."
    ],
    "microSentences": [
      "Il mio lavoro è creare esposizione qualificata",
      "generare contatti",
      "filtrare gli acquirenti",
      "ottenere feedback",
      "negoziare e aggiornarla con regolarità.",
      "Ogni settimana confronteremo attività e risposta del mercato.",
      "Se i dati ci dicono che qualcosa non funziona",
      "prenderemo una decisione insieme."
    ],
    "keywords": [
      "VENDERE PROCESSO NON PROMESSE",
      "MISURABILITÀ",
      "COMUNICAZIONE PERIODICA",
      "LISTING",
      "PRESENTATION",
      "PIANO",
      "D'AZIONE"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Come faccio a sapere che farà davvero tutto?"
    ],
    "followUps": [
      "Lo rendiamo verificabile: attività previste, aggiornamenti concordati e risultati misurabili."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-chiusura",
    "category": "LISTING PRESENTATION",
    "subcategory": "Chiusura",
    "title": "Chiusura incarico",
    "purpose": "Portare la presentazione a una decisione chiara.",
    "usage": "Quando prezzo, piano e condizioni sono stati discussi.",
    "italianAdapted": "Abbiamo chiarito obiettivo, tempi, prezzo e piano di lavoro. C'è qualcosa che le impedisce di procedere oggi? Se la risposta è no, iniziamo e preparo l'incarico.",
    "roleplayClient": "Voglio pensarci.",
    "roleplayAgent": "Certo. Su quale punto specifico vuole riflettere? Se lo chiariamo adesso, potrà decidere con tutte le informazioni davanti.",
    "memory": [
      "Domanda di chiusura diretta",
      "isola l'obiezione",
      "non ricominciare la presentazione."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "chiusura",
      "chiusura",
      "incarico"
    ],
    "workflowPhase": 7,
    "workflowOrder": 725,
    "sentences": [
      "Abbiamo chiarito obiettivo, tempi, prezzo e piano di lavoro.",
      "C'è qualcosa che le impedisce di procedere oggi?",
      "Se la risposta è no, iniziamo e preparo l'incarico."
    ],
    "microSentences": [
      "Abbiamo chiarito obiettivo",
      "prezzo e piano di lavoro.",
      "C'è qualcosa che le impedisce di procedere oggi?",
      "Se la risposta è no",
      "iniziamo e preparo l'incarico."
    ],
    "keywords": [
      "DOMANDA DI CHIUSURA DIRETTA",
      "ISOLA L'OBIEZIONE",
      "NON RICOMINCIARE LA PRESENTAZIONE",
      "LISTING",
      "PRESENTATION",
      "CHIUSURA",
      "INCARICO"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Voglio pensarci."
    ],
    "followUps": [
      "Certo. Su quale punto specifico vuole riflettere? Se lo chiariamo adesso, potrà decidere con tutte le informazioni davanti."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-prezzo",
    "category": "LISTING PRESENTATION",
    "subcategory": "Pricing",
    "title": "Prezzo di posizionamento",
    "purpose": "Separare il valore di mercato dal prezzo desiderato.",
    "usage": "Quando il venditore propone un prezzo non supportato dai dati.",
    "italianAdapted": "Capisco il prezzo che vorrebbe ottenere. Il mio compito però è mostrarle cosa stanno realmente pagando gli acquirenti per immobili comparabili. Possiamo scegliere qualunque prezzo, ma non possiamo obbligare il mercato ad accettarlo. Guardiamo insieme i dati e decidiamo il posizionamento che sostiene il suo obiettivo.",
    "roleplayClient": "Voglio comunque provare più alto.",
    "roleplayAgent": "Possiamo valutare i rischi: meno attenzione iniziale, più tempo sul mercato e possibili riduzioni successive. La decisione è sua; il mio dovere è renderle chiaro l'impatto.",
    "memory": [
      "Dati",
      "conseguenze",
      "responsabilità professionale",
      "nessuna promessa di prezzo."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "pricing",
      "prezzo",
      "di",
      "posizionamento"
    ],
    "workflowPhase": 7,
    "workflowOrder": 726,
    "sentences": [
      "Capisco il prezzo che vorrebbe ottenere.",
      "Il mio compito però è mostrarle cosa stanno realmente pagando gli acquirenti per immobili comparabili.",
      "Possiamo scegliere qualunque prezzo, ma non possiamo obbligare il mercato ad accettarlo.",
      "Guardiamo insieme i dati e decidiamo il posizionamento che sostiene il suo obiettivo."
    ],
    "microSentences": [
      "Capisco il prezzo che vorrebbe ottenere.",
      "Il mio compito però è mostrarle cosa stanno realmente pagando gli acquirenti per immobili comparabili.",
      "Possiamo scegliere qualunque prezzo",
      "ma non possiamo obbligare il mercato ad accettarlo.",
      "Guardiamo insieme i dati e decidiamo il posizionamento che sostiene il suo obiettivo."
    ],
    "keywords": [
      "DATI",
      "CONSEGUENZE",
      "RESPONSABILITÀ PROFESSIONALE",
      "NESSUNA PROMESSA DI PREZZO",
      "LISTING",
      "PRESENTATION",
      "PRICING"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Voglio comunque provare più alto."
    ],
    "followUps": [
      "Possiamo valutare i rischi: meno attenzione iniziale, più tempo sul mercato e possibili riduzioni successive. La decisione è sua; il mio dovere è renderle chiaro l'impatto."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-marketing",
    "category": "LISTING PRESENTATION",
    "subcategory": "Marketing",
    "title": "Piano marketing",
    "purpose": "Spiegare il marketing come processo finalizzato a contatti e offerte.",
    "usage": "Quando il proprietario chiede cosa farà l'agenzia.",
    "italianAdapted": "Non mi interessa solo pubblicare l'annuncio. L'obiettivo è produrre attenzione qualificata: preparazione dell'immobile, presentazione, distribuzione sui canali giusti, database, contatto diretto, follow-up, gestione visite, feedback e negoziazione. Misureremo ciò che genera richieste reali.",
    "roleplayClient": "Quindi basta metterlo sui portali?",
    "roleplayAgent": "I portali sono un canale, non il piano completo. Il valore sta nel processo che trasforma esposizione in appuntamenti e offerte.",
    "memory": [
      "Concreto",
      "niente buzzword",
      "collega attività a risultati misurabili."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "marketing",
      "piano",
      "marketing"
    ],
    "workflowPhase": 7,
    "workflowOrder": 727,
    "sentences": [
      "Non mi interessa solo pubblicare l'annuncio.",
      "L'obiettivo è produrre attenzione qualificata: preparazione dell'immobile, presentazione, distribuzione sui canali giusti, database, contatto diretto, follow-up, gestione visite, feedback e negoziazione.",
      "Misureremo ciò che genera richieste reali."
    ],
    "microSentences": [
      "Non mi interessa solo pubblicare l'annuncio.",
      "L'obiettivo è produrre attenzione qualificata",
      "preparazione dell'immobile",
      "presentazione",
      "distribuzione sui canali giusti",
      "contatto diretto",
      "follow-up",
      "gestione visite",
      "feedback e negoziazione.",
      "Misureremo ciò che genera richieste reali."
    ],
    "keywords": [
      "CONCRETO",
      "NIENTE BUZZWORD",
      "COLLEGA ATTIVITÀ A RISULTATI MISURABILI",
      "LISTING",
      "PRESENTATION",
      "MARKETING",
      "PIANO"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Quindi basta metterlo sui portali?"
    ],
    "followUps": [
      "I portali sono un canale, non il piano completo. Il valore sta nel processo che trasforma esposizione in appuntamenti e offerte."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-esclusiva",
    "category": "LISTING PRESENTATION",
    "subcategory": "Esclusiva",
    "title": "Perché lavorare in esclusiva",
    "purpose": "Spiegare il valore dell'incarico esclusivo senza pressione.",
    "usage": "Quando il venditore teme di limitarsi a una sola agenzia.",
    "italianAdapted": "Capisco il timore. L'esclusiva non dovrebbe servirle a legarsi a un agente, ma a rendere una persona responsabile di strategia, comunicazione, controllo del prezzo e coordinamento delle richieste. Se scegliamo di lavorare insieme, deve sapere esattamente chi risponde del risultato e delle attività.",
    "roleplayClient": "Preferisco più agenzie.",
    "roleplayAgent": "È una scelta possibile. Valutiamo però cosa comporta in termini di messaggio al mercato, coordinamento e responsabilità. Poi decide sulla base dei vantaggi e dei rischi.",
    "memory": [
      "Non demonizzare il non esclusivo",
      "evidenzia responsabilità e coerenza."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "esclusiva",
      "perché",
      "lavorare",
      "in",
      "esclusiva"
    ],
    "workflowPhase": 7,
    "workflowOrder": 728,
    "sentences": [
      "Capisco il timore.",
      "L'esclusiva non dovrebbe servirle a legarsi a un agente, ma a rendere una persona responsabile di strategia, comunicazione, controllo del prezzo e coordinamento delle richieste.",
      "Se scegliamo di lavorare insieme, deve sapere esattamente chi risponde del risultato e delle attività."
    ],
    "microSentences": [
      "Capisco il timore.",
      "L'esclusiva non dovrebbe servirle a legarsi a un agente",
      "ma a rendere una persona responsabile di strategia",
      "comunicazione",
      "controllo del prezzo e coordinamento delle richieste.",
      "Se scegliamo di lavorare insieme",
      "deve sapere esattamente chi risponde del risultato e delle attività."
    ],
    "keywords": [
      "NON DEMONIZZARE IL NON ESCLUSIVO",
      "EVIDENZIA RESPONSABILITÀ E COERENZA",
      "LISTING",
      "PRESENTATION",
      "ESCLUSIVA",
      "PERCHÉ",
      "LAVORARE"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Preferisco più agenzie."
    ],
    "followUps": [
      "È una scelta possibile. Valutiamo però cosa comporta in termini di messaggio al mercato, coordinamento e responsabilità. Poi decide sulla base dei vantaggi e dei rischi."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "listing-piano-azione",
    "category": "LISTING PRESENTATION",
    "subcategory": "Piano d'azione",
    "title": "Listing Plan of Action — sintesi F1",
    "purpose": "Dare al venditore una sequenza operativa chiara dal lancio alla negoziazione.",
    "usage": "Durante l'acquisizione.",
    "italianAdapted": "Il piano è semplice: prepariamo correttamente l'immobile, definiamo un prezzo coerente con i dati, lanciamo sui canali appropriati, attiviamo database e ricerca diretta, qualifichiamo le richieste, gestiamo visite e feedback, e rivediamo insieme i risultati con cadenza concordata. Quando arriva un'offerta, la negoziamo sulla base del suo obiettivo.",
    "roleplayClient": "E se non arrivano offerte?",
    "roleplayAgent": "Non aspettiamo passivamente: usiamo richieste, visite e feedback per capire quale leva correggere.",
    "memory": [
      "Sequenza",
      "controllo",
      "feedback",
      "revisione."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/product/mike-ferrys-real-estate-scripts-book-pdf-download/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "listing",
      "presentation",
      "piano",
      "d'azione",
      "listing",
      "plan",
      "of",
      "action",
      "—",
      "sintesi",
      "f1"
    ],
    "workflowPhase": 7,
    "workflowOrder": 748,
    "sentences": [
      "Il piano è semplice: prepariamo correttamente l'immobile, definiamo un prezzo coerente con i dati, lanciamo sui canali appropriati, attiviamo database e ricerca diretta, qualifichiamo le richieste, gestiamo visite e feedback, e rivediamo insieme i risultati con cadenza concordata.",
      "Quando arriva un'offerta, la negoziamo sulla base del suo obiettivo."
    ],
    "microSentences": [
      "Il piano è semplice",
      "prepariamo correttamente l'immobile",
      "definiamo un prezzo coerente con i dati",
      "lanciamo sui canali appropriati",
      "attiviamo database e ricerca diretta",
      "qualifichiamo le richieste",
      "gestiamo visite e feedback",
      "e rivediamo insieme i risultati con cadenza concordata.",
      "Quando arriva un'offerta",
      "la negoziamo sulla base del suo obiettivo."
    ],
    "keywords": [
      "SEQUENZA",
      "CONTROLLO",
      "FEEDBACK",
      "REVISIONE",
      "LISTING",
      "PRESENTATION",
      "PIANO"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "E se non arrivano offerte?"
    ],
    "followUps": [
      "Non aspettiamo passivamente: usiamo richieste, visite e feedback per capire quale leva correggere."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 3,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Riprendiamo rapidamente ciò che mi aveva detto al telefono.",
      "Dopo la vendita pensa di trasferirsi a [DESTINAZIONE], corretto?",
      "Il motivo principale è [MOTIVO].",
      "Vorrebbe essere trasferito entro [DATA].",
      "Aveva in mente un prezzo di [PREZZO] e mi aveva indicato [DEBITO RESIDUO] come eventuale importo ancora dovuto.",
      "Mi aveva anche detto che [NON] intende provare a vendere da solo.",
      "È ancora tutto corretto?",
      "È cambiato qualcosa?"
    ],
    "microSentences": [
      "Riprendiamo rapidamente ciò che mi aveva detto al telefono.",
      "Dopo la vendita pensa di trasferirsi a [DESTINAZIONE]",
      "corretto?",
      "Il motivo principale è [MOTIVO].",
      "Vorrebbe essere trasferito entro [DATA].",
      "Aveva in mente un prezzo di [PREZZO] e mi aveva indicato [DEBITO RESIDUO] come eventuale importo ancora dovuto.",
      "Mi aveva anche detto che [NON] intende provare a vendere da solo.",
      "È ancora tutto corretto?",
      "È cambiato qualcosa?"
    ],
    "id": "lp-03-riconferma-prequalifica",
    "workflowPhase": 8,
    "workflowOrder": 800,
    "subcategory": "08 · Riconferma motivazione",
    "title": "LP-03 · Riconferma della prequalifica",
    "purpose": "Rimettere sul tavolo le risposte date prima dell'incontro e verificare che nulla sia cambiato.",
    "usage": "Subito dopo l'apertura.",
    "italianAdapted": "Riprendiamo rapidamente ciò che mi aveva detto al telefono. Dopo la vendita pensa di trasferirsi a [DESTINAZIONE], corretto? Il motivo principale è [MOTIVO]. Vorrebbe essere trasferito entro [DATA]. Aveva in mente un prezzo di [PREZZO] e mi aveva indicato [DEBITO RESIDUO] come eventuale importo ancora dovuto. Mi aveva anche detto che [NON] intende provare a vendere da solo. È ancora tutto corretto? È cambiato qualcosa?",
    "roleplayClient": "Sul prezzo ci ho ripensato.",
    "roleplayAgent": "Perfetto, è proprio ciò che dobbiamo chiarire oggi. Prima confermiamo la motivazione, poi mettiamo il prezzo a confronto con i dati.",
    "keywords": [
      "DOVE",
      "PERCHÉ",
      "QUANDO",
      "PREZZO",
      "DEBITO",
      "PRIVATO"
    ],
    "memoryMap": [
      "DOVE",
      "PERCHÉ",
      "QUANDO",
      "PREZZO",
      "DEBITO",
      "PRIVATO",
      "CAMBIAMENTI"
    ],
    "objections": [
      "Ho cambiato idea sul prezzo"
    ],
    "followUps": [
      "Cosa è cambiato?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/02%2027%202023%20CMA%20Presentation%20Script.pdf"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Prima dei numeri voglio capire una cosa: quanto è importante per lei realizzare questo trasferimento entro la data che mi ha indicato?",
      "Cosa succede se l'immobile non viene venduto entro quel periodo?",
      "Quale conseguenza vuole evitare?",
      "Questo mi aiuta a capire quanto dobbiamo essere rigorosi su prezzo e strategia."
    ],
    "microSentences": [
      "Prima dei numeri voglio capire una cosa",
      "quanto è importante per lei realizzare questo trasferimento entro la data che mi ha indicato?",
      "Cosa succede se l'immobile non viene venduto entro quel periodo?",
      "Quale conseguenza vuole evitare?",
      "Questo mi aiuta a capire quanto dobbiamo essere rigorosi su prezzo e strategia."
    ],
    "id": "lp-04-motivazione",
    "workflowPhase": 8,
    "workflowOrder": 810,
    "subcategory": "08 · Motivazione",
    "title": "LP-04 · Motivazione e conseguenze",
    "purpose": "Confermare che esiste un motivo sufficientemente forte per vendere e collegarlo alla tempistica.",
    "usage": "Prima di entrare nel CMA.",
    "italianAdapted": "Prima dei numeri voglio capire una cosa: quanto è importante per lei realizzare questo trasferimento entro la data che mi ha indicato? Cosa succede se l'immobile non viene venduto entro quel periodo? Quale conseguenza vuole evitare? Questo mi aiuta a capire quanto dobbiamo essere rigorosi su prezzo e strategia.",
    "roleplayClient": "Non ho una vera fretta.",
    "roleplayAgent": "Va bene. Allora definiamo cosa conta di più per lei: massimizzare il prezzo, ridurre i tempi o mantenere maggiore flessibilità. La strategia dipende da questa priorità.",
    "keywords": [
      "IMPORTANZA",
      "SCADENZA",
      "CONSEGUENZA",
      "PRIORITÀ"
    ],
    "memoryMap": [
      "MOTIVAZIONE",
      "DATA",
      "CONSEGUENZA",
      "PRIORITÀ"
    ],
    "objections": [
      "Non ho fretta"
    ],
    "followUps": [
      "Qual è la priorità principale?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/02%2027%202023%20CMA%20Presentation%20Script.pdf"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 3,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Ora guardiamo i dati.",
      "Nel confronto ci sono immobili che i proprietari hanno messo sul mercato a determinati prezzi e immobili che il mercato ha effettivamente acquistato.",
      "Per decidere il nostro posizionamento dobbiamo dare più peso ai risultati reali, correggendo per zona, dimensione, stato, piano, accessori e caratteristiche specifiche del suo immobile.",
      "L'obiettivo non è scegliere il numero più piacevole, ma quello più difendibile davanti agli acquirenti."
    ],
    "microSentences": [
      "Ora guardiamo i dati.",
      "Nel confronto ci sono immobili che i proprietari hanno messo sul mercato a determinati prezzi e immobili che il mercato ha effettivamente acquistato.",
      "Per decidere il nostro posizionamento dobbiamo dare più peso ai risultati reali",
      "correggendo per zona",
      "dimensione",
      "accessori e caratteristiche specifiche del suo immobile.",
      "L'obiettivo non è scegliere il numero più piacevole",
      "ma quello più difendibile davanti agli acquirenti."
    ],
    "id": "lp-05-cma",
    "workflowPhase": 9,
    "workflowOrder": 900,
    "subcategory": "09 · CMA",
    "title": "LP-05 · Presentazione CMA",
    "purpose": "Separare prezzi richiesti da risultati reali e fondare la decisione su comparabili pertinenti.",
    "usage": "Dopo aver confermato motivazione e tempistica.",
    "italianAdapted": "Ora guardiamo i dati. Nel confronto ci sono immobili che i proprietari hanno messo sul mercato a determinati prezzi e immobili che il mercato ha effettivamente acquistato. Per decidere il nostro posizionamento dobbiamo dare più peso ai risultati reali, correggendo per zona, dimensione, stato, piano, accessori e caratteristiche specifiche del suo immobile. L'obiettivo non è scegliere il numero più piacevole, ma quello più difendibile davanti agli acquirenti.",
    "roleplayClient": "Il mio immobile però è molto più bello.",
    "roleplayAgent": "Può esserlo. Individuiamo insieme quali differenze un acquirente riconoscerebbe davvero e quanto quelle differenze risultano nei dati di vendita.",
    "keywords": [
      "RICHIESTO",
      "VENDUTO",
      "COMPARABILI",
      "CORREZIONI",
      "DATI"
    ],
    "memoryMap": [
      "RICHIESTO",
      "VENDUTO",
      "CONFRONTA",
      "CORREGGI",
      "DECIDI"
    ],
    "objections": [
      "Il mio è più bello"
    ],
    "followUps": [
      "Quali caratteristiche giustificano una correzione?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/02%2027%202023%20CMA%20Presentation%20Script.pdf"
  },
  {
    "id": "listing-cma",
    "category": "LISTING PRESENTATION",
    "subcategory": "CMA",
    "title": "Presentazione comparabili",
    "purpose": "Spiegare la valutazione comparativa in modo semplice.",
    "usage": "Durante la discussione del prezzo.",
    "italianAdapted": "Questi immobili ci danno tre informazioni: a quanto i proprietari chiedono, quali immobili restano invenduti e soprattutto a quanto si concludono realmente le compravendite comparabili. Il terzo dato è quello che deve guidare la nostra decisione, corretto per caratteristiche e stato del suo immobile.",
    "roleplayClient": "Il mio è più bello.",
    "roleplayAgent": "Può esserlo. Quantifichiamo insieme quali caratteristiche il mercato riconosce e quanto hanno inciso in vendite comparabili.",
    "memory": [
      "Comparabili",
      "venduto > richiesto",
      "correzioni motivate."
    ],
    "source": "Mike Ferry Italy / The Mike Ferry Organization — traduzione ufficiale italiana usata come riferimento",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/02%2027%202023%20CMA%20Presentation%20Script.pdf",
    "sourceType": "fonte ufficiale italiana di riferimento",
    "verificationStatus": "ADATTAMENTO F1 SU TRADUZIONE UFFICIALE MFO ITALIA",
    "tags": [
      "listing",
      "presentation",
      "cma",
      "presentazione",
      "comparabili"
    ],
    "workflowPhase": 9,
    "workflowOrder": 905,
    "sentences": [
      "Questi immobili ci danno tre informazioni: a quanto i proprietari chiedono, quali immobili restano invenduti e soprattutto a quanto si concludono realmente le compravendite comparabili.",
      "Il terzo dato è quello che deve guidare la nostra decisione, corretto per caratteristiche e stato del suo immobile."
    ],
    "microSentences": [
      "Questi immobili ci danno tre informazioni",
      "a quanto i proprietari chiedono",
      "quali immobili restano invenduti e soprattutto a quanto si concludono realmente le compravendite comparabili.",
      "Il terzo dato è quello che deve guidare la nostra decisione",
      "corretto per caratteristiche e stato del suo immobile."
    ],
    "keywords": [
      "COMPARABILI",
      "VENDUTO  RICHIESTO",
      "CORREZIONI MOTIVATE",
      "LISTING",
      "PRESENTATION",
      "CMA",
      "PRESENTAZIONE"
    ],
    "memoryMap": [
      "APRI",
      "CONFERMA",
      "DOMANDA",
      "ASCOLTA",
      "DATI",
      "PIANO",
      "CHIUDI"
    ],
    "objections": [
      "Il mio è più bello."
    ],
    "followUps": [
      "Può esserlo. Quantifichiamo insieme quali caratteristiche il mercato riconosce e quanto hanno inciso in vendite comparabili."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "CORRETTO NELL'AUDIT 2026-09-19",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Alla luce dei comparabili e della sua tempistica, dobbiamo scegliere se posizionare l'immobile per attirare domanda qualificata oppure testare un prezzo più alto accettando il rischio di tempo e successive riduzioni.",
      "La mia raccomandazione professionale è partire nella fascia sostenuta dai dati.",
      "Quale decisione è più coerente con l'obiettivo che mi ha indicato?"
    ],
    "microSentences": [
      "Alla luce dei comparabili e della sua tempistica",
      "dobbiamo scegliere se posizionare l'immobile per attirare domanda qualificata oppure testare un prezzo più alto accettando il rischio di tempo e successive riduzioni.",
      "La mia raccomandazione professionale è partire nella fascia sostenuta dai dati.",
      "Quale decisione è più coerente con l'obiettivo che mi ha indicato?"
    ],
    "id": "lp-06-prezzo",
    "workflowPhase": 10,
    "workflowOrder": 1000,
    "subcategory": "10 · Prezzo",
    "title": "LP-06 · Decisione sul prezzo",
    "purpose": "Portare il venditore da un prezzo desiderato a un prezzo coerente con motivazione e mercato.",
    "usage": "Dopo il CMA.",
    "italianAdapted": "Alla luce dei comparabili e della sua tempistica, dobbiamo scegliere se posizionare l'immobile per attirare domanda qualificata oppure testare un prezzo più alto accettando il rischio di tempo e successive riduzioni. La mia raccomandazione professionale è partire nella fascia sostenuta dai dati. Quale decisione è più coerente con l'obiettivo che mi ha indicato?",
    "roleplayClient": "Vorrei partire più alto e poi scendere.",
    "roleplayAgent": "Possiamo farlo solo sapendo il costo della scelta. Definiamo prima una regola precisa: entro quale data e in base a quali segnali rivedremo il prezzo, così non perdiamo il periodo iniziale più importante.",
    "keywords": [
      "DATI",
      "TEMPI",
      "RISCHIO",
      "FASCIA",
      "DECISIONE"
    ],
    "memoryMap": [
      "DATI",
      "DUE STRADE",
      "RISCHIO",
      "RACCOMANDA",
      "DECISIONE"
    ],
    "objections": [
      "Partiamo più alto"
    ],
    "followUps": [
      "Quale scelta è coerente con la sua scadenza?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Il mio compito è preparare correttamente l'immobile, presentarlo sul mercato, attivare i canali e i contatti appropriati, qualificare le richieste, organizzare visite, raccogliere feedback, comunicarle ciò che il mercato ci dice e negoziare le proposte.",
      "Da parte sua mi servono accesso concordato, informazioni corrette, disponibilità a valutare i feedback e decisioni rapide quando i dati richiedono un aggiustamento.",
      "Se entrambi facciamo la nostra parte, il processo resta controllabile."
    ],
    "microSentences": [
      "Il mio compito è preparare correttamente l'immobile",
      "presentarlo sul mercato",
      "attivare i canali e i contatti appropriati",
      "qualificare le richieste",
      "organizzare visite",
      "raccogliere feedback",
      "comunicarle ciò che il mercato ci dice e negoziare le proposte.",
      "Da parte sua mi servono accesso concordato",
      "informazioni corrette",
      "disponibilità a valutare i feedback e decisioni rapide quando i dati richiedono un aggiustamento.",
      "Se entrambi facciamo la nostra parte",
      "il processo resta controllabile."
    ],
    "id": "lp-07-piano",
    "workflowPhase": 11,
    "workflowOrder": 1100,
    "subcategory": "11 · Piano di vendita",
    "title": "LP-07 · Piano di vendita e responsabilità",
    "purpose": "Mostrare cosa farà l'agente e cosa serve dal venditore per eseguire il piano.",
    "usage": "Dopo aver affrontato il prezzo.",
    "italianAdapted": "Il mio compito è preparare correttamente l'immobile, presentarlo sul mercato, attivare i canali e i contatti appropriati, qualificare le richieste, organizzare visite, raccogliere feedback, comunicarle ciò che il mercato ci dice e negoziare le proposte. Da parte sua mi servono accesso concordato, informazioni corrette, disponibilità a valutare i feedback e decisioni rapide quando i dati richiedono un aggiustamento. Se entrambi facciamo la nostra parte, il processo resta controllabile.",
    "roleplayClient": "Quante pubblicità farà?",
    "roleplayAgent": "Le mostro i canali previsti, ma il punto decisivo è misurare richieste, visite, feedback e offerte. La quantità di pubblicità da sola non sostituisce prezzo e qualità della domanda.",
    "keywords": [
      "PREPARA",
      "PROMUOVI",
      "QUALIFICA",
      "FEEDBACK",
      "NEGOZIA",
      "RESPONSABILITÀ"
    ],
    "memoryMap": [
      "AGENTE",
      "VENDITORE",
      "MISURA",
      "COMUNICA",
      "AGGIUSTA"
    ],
    "objections": [
      "Quanta pubblicità?"
    ],
    "followUps": [
      "Concordiamo anche tempi e accessi?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/scripts/"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "La provvigione remunera il lavoro necessario per portare il processo dalla strategia iniziale alla negoziazione e alla conclusione.",
      "Prima di ridurla, preferisco verificare insieme se vede valore nel piano che abbiamo appena definito.",
      "Se il problema è il risultato netto, guardiamo quel numero: prezzo realistico, costi e ricavo finale.",
      "Qual è esattamente il punto che vuole chiarire sulla provvigione?"
    ],
    "microSentences": [
      "La provvigione remunera il lavoro necessario per portare il processo dalla strategia iniziale alla negoziazione e alla conclusione.",
      "Prima di ridurla",
      "preferisco verificare insieme se vede valore nel piano che abbiamo appena definito.",
      "Se il problema è il risultato netto",
      "guardiamo quel numero",
      "prezzo realistico",
      "costi e ricavo finale.",
      "Qual è esattamente il punto che vuole chiarire sulla provvigione?"
    ],
    "id": "lp-08-provvigione",
    "workflowPhase": 12,
    "workflowOrder": 1200,
    "subcategory": "12 · Provvigione",
    "title": "LP-08 · Provvigione",
    "purpose": "Discutere il compenso dopo aver chiarito valore, piano e responsabilità.",
    "usage": "Quando il cliente chiede condizioni economiche.",
    "italianAdapted": "La provvigione remunera il lavoro necessario per portare il processo dalla strategia iniziale alla negoziazione e alla conclusione. Prima di ridurla, preferisco verificare insieme se vede valore nel piano che abbiamo appena definito. Se il problema è il risultato netto, guardiamo quel numero: prezzo realistico, costi e ricavo finale. Qual è esattamente il punto che vuole chiarire sulla provvigione?",
    "roleplayClient": "Un'altra agenzia mi chiede meno.",
    "roleplayAgent": "Capisco. Oltre alla percentuale, cosa cambia nel servizio, nella strategia di prezzo, nella qualificazione e nella negoziazione? Confrontiamo il risultato atteso, non soltanto una voce di costo.",
    "keywords": [
      "VALORE",
      "NETTO",
      "CONFRONTO",
      "RISULTATO",
      "DOMANDA"
    ],
    "memoryMap": [
      "RICONOSCI",
      "VALORE",
      "NETTO",
      "CONFRONTA",
      "DOMANDA"
    ],
    "objections": [
      "Un'altra agenzia costa meno",
      "La provvigione è alta"
    ],
    "followUps": [
      "Qual è il punto preciso che vuole chiarire?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 4,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Quando emerge un'obiezione non la combatto.",
      "Prima la ascolto fino in fondo.",
      "Poi la riconosco e verifico se è il vero motivo che impedisce la decisione.",
      "Rispondo in modo breve e torno con una domanda alla scelta da fare.",
      "Se compare una seconda obiezione, ripeto lo stesso processo senza allungare il discorso."
    ],
    "microSentences": [
      "Quando emerge un'obiezione non la combatto.",
      "Prima la ascolto fino in fondo.",
      "Poi la riconosco e verifico se è il vero motivo che impedisce la decisione.",
      "Rispondo in modo breve e torno con una domanda alla scelta da fare.",
      "Se compare una seconda obiezione",
      "ripeto lo stesso processo senza allungare il discorso."
    ],
    "id": "lp-09-obiezioni",
    "workflowPhase": 13,
    "workflowOrder": 1300,
    "subcategory": "13 · Obiezioni",
    "title": "LP-09 · Processo di gestione obiezioni",
    "purpose": "Gestire le obiezioni in modo breve, logico e ripetibile.",
    "usage": "Quando il venditore introduce un ostacolo prima della firma.",
    "italianAdapted": "Quando emerge un'obiezione non la combatto. Prima la ascolto fino in fondo. Poi la riconosco e verifico se è il vero motivo che impedisce la decisione. Rispondo in modo breve e torno con una domanda alla scelta da fare. Se compare una seconda obiezione, ripeto lo stesso processo senza allungare il discorso.",
    "roleplayClient": "Voglio pensarci.",
    "roleplayAgent": "Certo. Su quale punto specifico sente di dover riflettere: prezzo, servizio, provvigione o decisione di vendere? Se isoliamo quel punto possiamo chiarirlo adesso.",
    "keywords": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Voglio pensarci",
      "Provvigione",
      "Esclusiva",
      "Altro agente",
      "Prezzo alto"
    ],
    "followUps": [
      "Qual è il vero punto che blocca la decisione?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/"
  },
  {
    "id": "obiezione-pensarci",
    "category": "OBIEZIONI",
    "subcategory": "Decisione",
    "title": "Voglio pensarci",
    "purpose": "Isolare la vera ragione dell'esitazione.",
    "usage": "Quando il venditore rinvia una decisione.",
    "italianAdapted": "Certamente. Per aiutarla a riflettere sulla cosa giusta: qual è precisamente il punto su cui vuole pensarci? È il prezzo, la provvigione, il piano, l'esclusiva oppure qualcos'altro?",
    "roleplayClient": "Non lo so, voglio solo pensarci.",
    "roleplayAgent": "Capisco. Se tutto il resto fosse chiaro, ci sarebbe qualcosa che le impedirebbe di partire?",
    "memory": [
      "Accetta",
      "isola",
      "chiarisci",
      "chiedi decisione solo dopo aver risolto il punto reale."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "decisione",
      "voglio",
      "pensarci"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1329,
    "sentences": [
      "Certamente.",
      "Per aiutarla a riflettere sulla cosa giusta: qual è precisamente il punto su cui vuole pensarci?",
      "È il prezzo, la provvigione, il piano, l'esclusiva oppure qualcos'altro?"
    ],
    "microSentences": [
      "Certamente.",
      "Per aiutarla a riflettere sulla cosa giusta",
      "qual è precisamente il punto su cui vuole pensarci?",
      "È il prezzo",
      "la provvigione",
      "l'esclusiva oppure qualcos'altro?"
    ],
    "keywords": [
      "ACCETTA",
      "ISOLA",
      "CHIARISCI",
      "CHIEDI DECISIONE SOLO DOPO AVER RISOLTO IL PUNTO REALE",
      "OBIEZIONI",
      "DECISIONE",
      "VOGLIO"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Non lo so, voglio solo pensarci."
    ],
    "followUps": [
      "Capisco. Se tutto il resto fosse chiaro, ci sarebbe qualcosa che le impedirebbe di partire?"
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-coniuge",
    "category": "OBIEZIONI",
    "subcategory": "Decisori",
    "title": "Devo parlarne con il coniuge",
    "purpose": "Evitare una decisione incompleta e riportare tutti i decisori allo stesso tavolo.",
    "usage": "Quando manca un decisore.",
    "italianAdapted": "È corretto che decidiate insieme. Per evitare che lei debba ricostruire la presentazione, fissiamo un breve incontro quando potete esserci entrambi. Quale momento è più semplice?",
    "roleplayClient": "Gli spiego io.",
    "roleplayAgent": "Certo, ma così potrebbe mancare qualche dettaglio importante. Preferisco rispondere direttamente alle domande di entrambi.",
    "memory": [
      "Rispetta il processo decisionale",
      "niente pressione",
      "nuova data precisa."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "decisori",
      "devo",
      "parlarne",
      "con",
      "il",
      "coniuge"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1330,
    "sentences": [
      "È corretto che decidiate insieme.",
      "Per evitare che lei debba ricostruire la presentazione, fissiamo un breve incontro quando potete esserci entrambi.",
      "Quale momento è più semplice?"
    ],
    "microSentences": [
      "È corretto che decidiate insieme.",
      "Per evitare che lei debba ricostruire la presentazione",
      "fissiamo un breve incontro quando potete esserci entrambi.",
      "Quale momento è più semplice?"
    ],
    "keywords": [
      "RISPETTA IL PROCESSO DECISIONALE",
      "NIENTE PRESSIONE",
      "NUOVA DATA PRECISA",
      "OBIEZIONI",
      "DECISORI",
      "DEVO",
      "PARLARNE"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Gli spiego io."
    ],
    "followUps": [
      "Certo, ma così potrebbe mancare qualche dettaglio importante. Preferisco rispondere direttamente alle domande di entrambi."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-provvigione",
    "category": "OBIEZIONI",
    "subcategory": "Provvigione",
    "title": "La provvigione è troppo alta",
    "purpose": "Difendere il valore senza entrare subito in sconto.",
    "usage": "Quando il venditore confronta commissioni.",
    "italianAdapted": "Capisco che voglia controllare i costi. Posso farle una domanda? Preferisce l'agente che costa meno o quello che, al netto di costi e negoziazione, le lascia il risultato migliore? Guardiamo cosa comprende il servizio e quale risultato deve produrre.",
    "roleplayClient": "Un'altra agenzia prende meno.",
    "roleplayAgent": "È possibile. Confrontiamo però attività, responsabilità, strategia e soprattutto risultato netto. Poi potrà decidere se la differenza di servizio giustifica la differenza di costo.",
    "memory": [
      "Valore e netto",
      "niente attacchi al concorrente",
      "niente sconto automatico."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "provvigione",
      "la",
      "provvigione",
      "è",
      "troppo",
      "alta"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1331,
    "sentences": [
      "Capisco che voglia controllare i costi.",
      "Posso farle una domanda?",
      "Preferisce l'agente che costa meno o quello che, al netto di costi e negoziazione, le lascia il risultato migliore?",
      "Guardiamo cosa comprende il servizio e quale risultato deve produrre."
    ],
    "microSentences": [
      "Capisco che voglia controllare i costi.",
      "Posso farle una domanda?",
      "Preferisce l'agente che costa meno o quello che",
      "al netto di costi e negoziazione",
      "le lascia il risultato migliore?",
      "Guardiamo cosa comprende il servizio e quale risultato deve produrre."
    ],
    "keywords": [
      "VALORE E NETTO",
      "NIENTE ATTACCHI AL CONCORRENTE",
      "NIENTE SCONTO AUTOMATICO",
      "OBIEZIONI",
      "PROVVIGIONE",
      "TROPPO",
      "ALTA"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Un'altra agenzia prende meno."
    ],
    "followUps": [
      "È possibile. Confrontiamo però attività, responsabilità, strategia e soprattutto risultato netto. Poi potrà decidere se la differenza di servizio giustifica la differenza di costo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-valutazione-alta",
    "category": "OBIEZIONI",
    "subcategory": "Prezzo",
    "title": "Un altro agente valuta più alto",
    "purpose": "Riportare la discussione da opinioni a evidenze.",
    "usage": "Quando un concorrente propone un prezzo superiore.",
    "italianAdapted": "Capisco perché una valutazione più alta sia attraente. La domanda però è: quali vendite concluse e quali dati sostengono quel numero? Il prezzo che conta non è quello che promettiamo noi agenti, ma quello che un acquirente qualificato è disposto a pagare.",
    "roleplayClient": "L'altro agente è sicuro.",
    "roleplayAgent": "Chiediamogli di mostrare comparabili e logica. Io faccio lo stesso. Così può decidere sui dati, non sulle promesse.",
    "memory": [
      "Non competere al rialzo",
      "chiedi evidenza",
      "proteggi fiducia."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "prezzo",
      "un",
      "altro",
      "agente",
      "valuta",
      "più",
      "alto"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1332,
    "sentences": [
      "Capisco perché una valutazione più alta sia attraente.",
      "La domanda però è: quali vendite concluse e quali dati sostengono quel numero?",
      "Il prezzo che conta non è quello che promettiamo noi agenti, ma quello che un acquirente qualificato è disposto a pagare."
    ],
    "microSentences": [
      "Capisco perché una valutazione più alta sia attraente.",
      "La domanda però è",
      "quali vendite concluse e quali dati sostengono quel numero?",
      "Il prezzo che conta non è quello che promettiamo noi agenti",
      "ma quello che un acquirente qualificato è disposto a pagare."
    ],
    "keywords": [
      "NON COMPETERE AL RIALZO",
      "CHIEDI EVIDENZA",
      "PROTEGGI FIDUCIA",
      "OBIEZIONI",
      "PREZZO",
      "ALTRO",
      "AGENTE"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "L'altro agente è sicuro."
    ],
    "followUps": [
      "Chiediamogli di mostrare comparabili e logica. Io faccio lo stesso. Così può decidere sui dati, non sulle promesse."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-esclusiva",
    "category": "OBIEZIONI",
    "subcategory": "Esclusiva",
    "title": "Non voglio esclusiva",
    "purpose": "Capire la paura dietro il rifiuto dell'esclusiva.",
    "usage": "Quando il venditore rifiuta un incarico esclusivo.",
    "italianAdapted": "Capisco. Cosa la preoccupa di più dell'esclusiva: essere vincolato, non vedere attività, perdere opportunità o aver avuto una brutta esperienza? Se capisco il punto, posso dirle come lo gestiamo.",
    "roleplayClient": "Non voglio essere bloccato.",
    "roleplayAgent": "È ragionevole. Definiamo attività, comunicazione e condizioni in modo trasparente, così sa esattamente cosa aspettarsi prima di decidere.",
    "memory": [
      "Indaga paura specifica",
      "rispondi a quella",
      "non recitare una difesa generica."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "esclusiva",
      "non",
      "voglio",
      "esclusiva"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1333,
    "sentences": [
      "Capisco.",
      "Cosa la preoccupa di più dell'esclusiva: essere vincolato, non vedere attività, perdere opportunità o aver avuto una brutta esperienza?",
      "Se capisco il punto, posso dirle come lo gestiamo."
    ],
    "microSentences": [
      "Cosa la preoccupa di più dell'esclusiva",
      "essere vincolato",
      "non vedere attività",
      "perdere opportunità o aver avuto una brutta esperienza?",
      "Se capisco il punto",
      "posso dirle come lo gestiamo."
    ],
    "keywords": [
      "INDAGA PAURA SPECIFICA",
      "RISPONDI A QUELLA",
      "NON RECITARE UNA DIFESA GENERICA",
      "OBIEZIONI",
      "ESCLUSIVA",
      "NON",
      "VOGLIO"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio essere bloccato."
    ],
    "followUps": [
      "È ragionevole. Definiamo attività, comunicazione e condizioni in modo trasparente, così sa esattamente cosa aspettarsi prima di decidere."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-conosco-agente",
    "category": "OBIEZIONI",
    "subcategory": "Concorrente",
    "title": "Conosco già un agente",
    "purpose": "Ottenere il diritto a un confronto senza svalutare la relazione esistente.",
    "usage": "Quando il proprietario ha un agente di fiducia.",
    "italianAdapted": "Capisco. È normale voler lavorare con una persona di fiducia. Prima di decidere, sarebbe contrario a confrontare per quindici minuti strategia, prezzo e piano di lavoro? Se il suo agente rimane la scelta migliore, avrà semplicemente confermato la decisione.",
    "roleplayClient": "Mi sembra scorretto.",
    "roleplayAgent": "Non voglio metterla in difficoltà né parlare male di nessuno. Le propongo solo un confronto professionale prima di una decisione importante.",
    "memory": [
      "Rispetta relazione",
      "chiedi confronto",
      "nessuna denigrazione."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "concorrente",
      "conosco",
      "già",
      "un",
      "agente"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1334,
    "sentences": [
      "Capisco.",
      "È normale voler lavorare con una persona di fiducia.",
      "Prima di decidere, sarebbe contrario a confrontare per quindici minuti strategia, prezzo e piano di lavoro?",
      "Se il suo agente rimane la scelta migliore, avrà semplicemente confermato la decisione."
    ],
    "microSentences": [
      "È normale voler lavorare con una persona di fiducia.",
      "Prima di decidere",
      "sarebbe contrario a confrontare per quindici minuti strategia",
      "prezzo e piano di lavoro?",
      "Se il suo agente rimane la scelta migliore",
      "avrà semplicemente confermato la decisione."
    ],
    "keywords": [
      "RISPETTA RELAZIONE",
      "CHIEDI CONFRONTO",
      "NESSUNA DENIGRAZIONE",
      "OBIEZIONI",
      "CONCORRENTE",
      "CONOSCO",
      "GIÀ"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Mi sembra scorretto."
    ],
    "followUps": [
      "Non voglio metterla in difficoltà né parlare male di nessuno. Le propongo solo un confronto professionale prima di una decisione importante."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-richiamami",
    "category": "OBIEZIONI",
    "subcategory": "Timing",
    "title": "Richiamami più avanti",
    "purpose": "Trasformare un rinvio generico in una data o condizione precisa.",
    "usage": "Quando il lead chiede di essere richiamato.",
    "italianAdapted": "Certamente. Per non disturbarla a caso, quando esattamente avrebbe senso risentirci? E cosa dovrebbe essere cambiato per allora?",
    "roleplayClient": "Tra qualche mese.",
    "roleplayAgent": "Perfetto. Quale mese? Le segno un contatto e nel frattempo non la disturbo.",
    "memory": [
      "Data precisa",
      "trigger",
      "rispetto del consenso e della preferenza di contatto."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "timing",
      "richiamami",
      "più",
      "avanti"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1335,
    "sentences": [
      "Certamente.",
      "Per non disturbarla a caso, quando esattamente avrebbe senso risentirci?",
      "E cosa dovrebbe essere cambiato per allora?"
    ],
    "microSentences": [
      "Certamente.",
      "Per non disturbarla a caso",
      "quando esattamente avrebbe senso risentirci?",
      "E cosa dovrebbe essere cambiato per allora?"
    ],
    "keywords": [
      "DATA PRECISA",
      "TRIGGER",
      "RISPETTO DEL CONSENSO E DELLA PREFERENZA DI CONTATTO",
      "OBIEZIONI",
      "TIMING",
      "RICHIAMAMI",
      "PIÙ"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Tra qualche mese."
    ],
    "followUps": [
      "Perfetto. Quale mese? Le segno un contatto e nel frattempo non la disturbo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-origine-numero",
    "category": "OBIEZIONI",
    "subcategory": "Privacy",
    "title": "Da dove ha preso il mio numero?",
    "purpose": "Rispondere con trasparenza e rispettare immediatamente l'eventuale opposizione.",
    "usage": "Quando viene chiesta la provenienza del contatto.",
    "italianAdapted": "Le dico subito da quale fonte proviene il contatto e perché l'ho chiamata. Se preferisce non ricevere altre chiamate da noi, lo registro immediatamente e non la ricontattiamo per questa finalità.",
    "roleplayClient": "Non voglio altre chiamate.",
    "roleplayAgent": "Ricevuto. Aggiorno subito le nostre note e non la ricontatteremo per questa attività.",
    "memory": [
      "Trasparenza",
      "nessuna evasione",
      "rispetto opposizione",
      "verificare obblighi RPO/GDPR prima delle campagne."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://registrodelleopposizioni.it/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "privacy",
      "da",
      "dove",
      "ha",
      "preso",
      "il",
      "mio",
      "numero?"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1336,
    "sentences": [
      "Le dico subito da quale fonte proviene il contatto e perché l'ho chiamata.",
      "Se preferisce non ricevere altre chiamate da noi, lo registro immediatamente e non la ricontattiamo per questa finalità."
    ],
    "microSentences": [
      "Le dico subito da quale fonte proviene il contatto e perché l'ho chiamata.",
      "Se preferisce non ricevere altre chiamate da noi",
      "lo registro immediatamente e non la ricontattiamo per questa finalità."
    ],
    "keywords": [
      "TRASPARENZA",
      "NESSUNA EVASIONE",
      "RISPETTO OPPOSIZIONE",
      "VERIFICARE OBBLIGHI RPOGDPR PRIMA DELLE CAMPAGNE",
      "OBIEZIONI",
      "PRIVACY",
      "DOVE"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio altre chiamate."
    ],
    "followUps": [
      "Ricevuto. Aggiorno subito le nostre note e non la ricontatteremo per questa attività."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-non-interessato",
    "category": "OBIEZIONI",
    "subcategory": "Rifiuto",
    "title": "Non sono interessato",
    "purpose": "Capire se è un no definitivo o un problema di timing.",
    "usage": "Quando il contatto rifiuta rapidamente.",
    "italianAdapted": "Capisco. Solo per aggiornare correttamente le mie note: non è interessato a vendere in generale oppure non è il momento?",
    "roleplayClient": "Non voglio vendere.",
    "roleplayAgent": "Perfetto, grazie. Non insisto. Se in futuro avrà bisogno di un'informazione immobiliare, resto a disposizione.",
    "memory": [
      "Una sola domanda di chiarimento",
      "poi rispetta il no."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "rifiuto",
      "non",
      "sono",
      "interessato"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1337,
    "sentences": [
      "Capisco.",
      "Solo per aggiornare correttamente le mie note: non è interessato a vendere in generale oppure non è il momento?"
    ],
    "microSentences": [
      "Solo per aggiornare correttamente le mie note",
      "non è interessato a vendere in generale oppure non è il momento?"
    ],
    "keywords": [
      "UNA SOLA DOMANDA DI CHIARIMENTO",
      "POI RISPETTA IL NO",
      "OBIEZIONI",
      "RIFIUTO",
      "NON",
      "SONO",
      "INTERESSATO"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio vendere."
    ],
    "followUps": [
      "Perfetto, grazie. Non insisto. Se in futuro avrà bisogno di un'informazione immobiliare, resto a disposizione."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-non-fretta",
    "category": "OBIEZIONI",
    "subcategory": "Timing",
    "title": "Non ho fretta",
    "purpose": "Capire il vero obiettivo e spiegare il costo di un posizionamento errato.",
    "usage": "Quando il venditore non ha una scadenza.",
    "italianAdapted": "Non avere fretta è un vantaggio, perché possiamo prendere decisioni razionali. Qual è però il risultato che vorrebbe ottenere e entro quale periodo sarebbe ideale? Anche senza urgenza, il mercato giudica il prezzo fin dal primo giorno.",
    "roleplayClient": "Posso aspettare anche un anno.",
    "roleplayAgent": "Certo. La domanda è se un anno sul mercato aiuta o indebolisce la percezione dell'immobile. Valutiamo la strategia prima di partire.",
    "memory": [
      "Trasforma assenza di urgenza in pianificazione",
      "evita allarmismo."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://www.mikeferry.com/blog/post/how-to-overcome-the-most-common-objections-in-real-estate/",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "timing",
      "non",
      "ho",
      "fretta"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1338,
    "sentences": [
      "Non avere fretta è un vantaggio, perché possiamo prendere decisioni razionali.",
      "Qual è però il risultato che vorrebbe ottenere e entro quale periodo sarebbe ideale?",
      "Anche senza urgenza, il mercato giudica il prezzo fin dal primo giorno."
    ],
    "microSentences": [
      "Non avere fretta è un vantaggio",
      "perché possiamo prendere decisioni razionali.",
      "Qual è però il risultato che vorrebbe ottenere e entro quale periodo sarebbe ideale?",
      "Anche senza urgenza",
      "il mercato giudica il prezzo fin dal primo giorno."
    ],
    "keywords": [
      "TRASFORMA ASSENZA DI URGENZA IN PIANIFICAZIONE",
      "EVITA ALLARMISMO",
      "OBIEZIONI",
      "TIMING",
      "NON",
      "FRETTA"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Posso aspettare anche un anno."
    ],
    "followUps": [
      "Certo. La domanda è se un anno sul mercato aiuta o indebolisce la percezione dell'immobile. Valutiamo la strategia prima di partire."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-prima-comprare",
    "category": "OBIEZIONI",
    "subcategory": "Sequenza",
    "title": "Prima devo comprare casa",
    "purpose": "Coordinare vendita e acquisto senza forzare l'ordine.",
    "usage": "Quando il venditore teme di restare senza casa.",
    "italianAdapted": "È una preoccupazione concreta. Prima di decidere la sequenza, analizziamo disponibilità, tempi medi, capacità finanziaria e condizioni che possiamo inserire nella negoziazione. L'obiettivo è costruire un piano in cui vendita e acquisto siano coordinati.",
    "roleplayClient": "Non voglio rischiare di restare senza casa.",
    "roleplayAgent": "È corretto. Non le propongo di partire alla cieca: prima definiamo scenari e margini di sicurezza.",
    "memory": [
      "Pianifica",
      "coordina",
      "non promettere sincronizzazione perfetta."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "sequenza",
      "prima",
      "devo",
      "comprare",
      "casa"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1339,
    "sentences": [
      "È una preoccupazione concreta.",
      "Prima di decidere la sequenza, analizziamo disponibilità, tempi medi, capacità finanziaria e condizioni che possiamo inserire nella negoziazione.",
      "L'obiettivo è costruire un piano in cui vendita e acquisto siano coordinati."
    ],
    "microSentences": [
      "È una preoccupazione concreta.",
      "Prima di decidere la sequenza",
      "analizziamo disponibilità",
      "tempi medi",
      "capacità finanziaria e condizioni che possiamo inserire nella negoziazione.",
      "L'obiettivo è costruire un piano in cui vendita e acquisto siano coordinati."
    ],
    "keywords": [
      "PIANIFICA",
      "COORDINA",
      "NON PROMETTERE SINCRONIZZAZIONE PERFETTA",
      "OBIEZIONI",
      "SEQUENZA",
      "PRIMA",
      "DEVO"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Non voglio rischiare di restare senza casa."
    ],
    "followUps": [
      "È corretto. Non le propongo di partire alla cieca: prima definiamo scenari e margini di sicurezza."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "price-weekly",
    "category": "PRICE REDUCTION",
    "subcategory": "Revisione",
    "title": "Revisione periodica prezzo",
    "purpose": "Preparare una conversazione basata sulla risposta del mercato.",
    "usage": "Durante aggiornamenti periodici dell'incarico.",
    "italianAdapted": "Rivediamo i dati: esposizione, richieste, visite, feedback e offerte. Se l'attività c'è ma il mercato non si muove verso una proposta, dobbiamo chiederci quale variabile possiamo controllare. La principale è il posizionamento di prezzo. Quale adeguamento ci permette di competere meglio?",
    "roleplayClient": "Non voglio abbassare.",
    "roleplayAgent": "Capisco. Valutiamo cosa ci costerebbe non cambiare nulla per altre due o tre settimane e confrontiamolo con una correzione oggi.",
    "memory": [
      "Dati prima",
      "conseguenze",
      "decisione condivisa",
      "niente ribasso arbitrario."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2026%202023%20Price%20Reduction%20Script.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "price",
      "reduction",
      "revisione",
      "revisione",
      "periodica",
      "prezzo"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1340,
    "sentences": [
      "Rivediamo i dati: esposizione, richieste, visite, feedback e offerte.",
      "Se l'attività c'è ma il mercato non si muove verso una proposta, dobbiamo chiederci quale variabile possiamo controllare.",
      "La principale è il posizionamento di prezzo.",
      "Quale adeguamento ci permette di competere meglio?"
    ],
    "microSentences": [
      "Rivediamo i dati",
      "esposizione",
      "richieste",
      "feedback e offerte.",
      "Se l'attività c'è ma il mercato non si muove verso una proposta",
      "dobbiamo chiederci quale variabile possiamo controllare.",
      "La principale è il posizionamento di prezzo.",
      "Quale adeguamento ci permette di competere meglio?"
    ],
    "keywords": [
      "DATI PRIMA",
      "CONSEGUENZE",
      "DECISIONE CONDIVISA",
      "NIENTE RIBASSO ARBITRARIO",
      "PRICE",
      "REDUCTION",
      "REVISIONE"
    ],
    "memoryMap": [
      "DATI",
      "FEEDBACK",
      "SCOSTAMENTO",
      "DECISIONE",
      "REVISIONE"
    ],
    "objections": [
      "Non voglio abbassare."
    ],
    "followUps": [
      "Capisco. Valutiamo cosa ci costerebbe non cambiare nulla per altre due o tre settimane e confrontiamolo con una correzione oggi."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "price-no-visite",
    "category": "PRICE REDUCTION",
    "subcategory": "Nessuna visita",
    "title": "Prezzo — nessuna visita",
    "purpose": "Usare assenza di visite come segnale da interpretare.",
    "usage": "Quando l'immobile riceve esposizione ma quasi nessuna visita.",
    "italianAdapted": "La promozione sta producendo visualizzazioni, ma non appuntamenti. Questo ci dice che gli acquirenti stanno confrontando l'immobile con alternative che percepiscono come più convenienti. Dobbiamo correggere presentazione, prezzo o entrambe. Guardiamo i comparabili attuali.",
    "roleplayClient": "Aspettiamo ancora.",
    "roleplayAgent": "Possiamo farlo, ma definiamo già una data e un indicatore oggettivo: se entro quella data non cambia la risposta, interveniamo.",
    "memory": [
      "Segnale -> ipotesi -> confronto -> soglia decisionale."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2026%202023%20Price%20Reduction%20Script.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "price",
      "reduction",
      "nessuna",
      "visita",
      "prezzo",
      "—",
      "nessuna",
      "visita"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1341,
    "sentences": [
      "La promozione sta producendo visualizzazioni, ma non appuntamenti.",
      "Questo ci dice che gli acquirenti stanno confrontando l'immobile con alternative che percepiscono come più convenienti.",
      "Dobbiamo correggere presentazione, prezzo o entrambe.",
      "Guardiamo i comparabili attuali."
    ],
    "microSentences": [
      "La promozione sta producendo visualizzazioni",
      "ma non appuntamenti.",
      "Questo ci dice che gli acquirenti stanno confrontando l'immobile con alternative che percepiscono come più convenienti.",
      "Dobbiamo correggere presentazione",
      "prezzo o entrambe.",
      "Guardiamo i comparabili attuali."
    ],
    "keywords": [
      "SEGNALE - IPOTESI - CONFRONTO - SOGLIA DECISIONALE",
      "PRICE",
      "REDUCTION",
      "NESSUNA",
      "VISITA",
      "PREZZO"
    ],
    "memoryMap": [
      "DATI",
      "FEEDBACK",
      "SCOSTAMENTO",
      "DECISIONE",
      "REVISIONE"
    ],
    "objections": [
      "Aspettiamo ancora."
    ],
    "followUps": [
      "Possiamo farlo, ma definiamo già una data e un indicatore oggettivo: se entro quella data non cambia la risposta, interveniamo."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "price-visite-no-offerte",
    "category": "PRICE REDUCTION",
    "subcategory": "Visite senza offerte",
    "title": "Prezzo — visite senza offerte",
    "purpose": "Interpretare molte visite senza proposte.",
    "usage": "Quando ci sono visite ma nessuna offerta.",
    "italianAdapted": "Le visite ci dicono che il marketing sta attirando interesse. L'assenza di offerte indica invece che, dopo il confronto dal vivo, gli acquirenti non vedono sufficiente valore al prezzo attuale. Vediamo i feedback ricorrenti e decidiamo cosa correggere.",
    "roleplayClient": "Magari arriva quello giusto.",
    "roleplayAgent": "È possibile. La domanda è quanto tempo vuole investire aspettando un'eccezione rispetto al comportamento che stiamo osservando.",
    "memory": [
      "Usa feedback reali",
      "evita assoluti",
      "collega prezzo alla percezione di valore."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2026%202023%20Price%20Reduction%20Script.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "price",
      "reduction",
      "visite",
      "senza",
      "offerte",
      "prezzo",
      "—",
      "visite",
      "senza",
      "offerte"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1342,
    "sentences": [
      "Le visite ci dicono che il marketing sta attirando interesse.",
      "L'assenza di offerte indica invece che, dopo il confronto dal vivo, gli acquirenti non vedono sufficiente valore al prezzo attuale.",
      "Vediamo i feedback ricorrenti e decidiamo cosa correggere."
    ],
    "microSentences": [
      "Le visite ci dicono che il marketing sta attirando interesse.",
      "L'assenza di offerte indica invece che",
      "dopo il confronto dal vivo",
      "gli acquirenti non vedono sufficiente valore al prezzo attuale.",
      "Vediamo i feedback ricorrenti e decidiamo cosa correggere."
    ],
    "keywords": [
      "USA FEEDBACK REALI",
      "EVITA ASSOLUTI",
      "COLLEGA PREZZO ALLA PERCEZIONE DI VALORE",
      "PRICE",
      "REDUCTION",
      "VISITE",
      "SENZA"
    ],
    "memoryMap": [
      "DATI",
      "FEEDBACK",
      "SCOSTAMENTO",
      "DECISIONE",
      "REVISIONE"
    ],
    "objections": [
      "Magari arriva quello giusto."
    ],
    "followUps": [
      "È possibile. La domanda è quanto tempo vuole investire aspettando un'eccezione rispetto al comportamento che stiamo osservando."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-prezzo-alto",
    "category": "OBIEZIONI",
    "subcategory": "Pricing",
    "title": "Voglio partire più alto",
    "purpose": "Mostrare il rischio di usare il mercato come test senza controllo.",
    "usage": "Quando il venditore vuole sovrapprezzare per poi ridurre.",
    "italianAdapted": "Capisco la logica di lasciare margine. Il rischio è che i primi acquirenti, spesso i più attenti e preparati, ci confrontino subito con alternative meglio posizionate. Possiamo definire un prezzo iniziale sostenuto dai dati e una regola di revisione precisa, invece di affidarci al caso.",
    "roleplayClient": "Al massimo abbassiamo dopo.",
    "roleplayAgent": "Possiamo farlo, ma decidiamo prima quando e sulla base di quali segnali, così la riduzione non diventa una reazione tardiva.",
    "memory": [
      "Spiega costo del tempo",
      "predefinisci revisione."
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2026%202023%20Price%20Reduction%20Script.pdf",
    "sourceType": "fonte primaria/ufficiale",
    "verificationStatus": "ADATTAMENTO BASATO SUL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "pricing",
      "voglio",
      "partire",
      "più",
      "alto"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1356,
    "sentences": [
      "Capisco la logica di lasciare margine.",
      "Il rischio è che i primi acquirenti, spesso i più attenti e preparati, ci confrontino subito con alternative meglio posizionate.",
      "Possiamo definire un prezzo iniziale sostenuto dai dati e una regola di revisione precisa, invece di affidarci al caso."
    ],
    "microSentences": [
      "Capisco la logica di lasciare margine.",
      "Il rischio è che i primi acquirenti",
      "spesso i più attenti e preparati",
      "ci confrontino subito con alternative meglio posizionate.",
      "Possiamo definire un prezzo iniziale sostenuto dai dati e una regola di revisione precisa",
      "invece di affidarci al caso."
    ],
    "keywords": [
      "SPIEGA COSTO DEL TEMPO",
      "PREDEFINISCI REVISIONE",
      "OBIEZIONI",
      "PRICING",
      "VOGLIO",
      "PARTIRE",
      "PIÙ"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Al massimo abbassiamo dopo."
    ],
    "followUps": [
      "Possiamo farlo, ma decidiamo prima quando e sulla base di quali segnali, così la riduzione non diventa una reazione tardiva."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "VERIFICATO COME ADATTAMENTO MFO",
    "reviewedAt": "2026-09-19"
  },
  {
    "id": "obiezione-multiagenzia",
    "category": "OBIEZIONI",
    "subcategory": "Multiagenzia",
    "title": "Ho già più agenzie",
    "purpose": "Comprendere cosa manca nell'attuale strategia e proporre responsabilità chiara.",
    "usage": "Quando il proprietario lavora già con più intermediari.",
    "italianAdapted": "Capisco. Come sta andando finora? Chi coordina prezzo, comunicazione, feedback e negoziazione? Se il risultato non è quello che vuole, può avere senso confrontare il modello attuale con una strategia in cui una persona è chiaramente responsabile del piano.",
    "roleplayClient": "Più agenzie significa più clienti.",
    "roleplayAgent": "Può aumentare i punti di contatto, ma non sempre aumenta controllo e coerenza. Valutiamo dati reali: richieste, visite, feedback e offerte ottenute finora.",
    "memory": [
      "Non criticare",
      "misura risultati",
      "mostra trade-off."
    ],
    "source": "Contesto normativo/operativo italiano + metodo MFO",
    "sourceUrl": "https://www.mikeferry.com/scripts/",
    "sourceType": "adattamento F1",
    "verificationStatus": "VERSIONE F1 ISPIRATA AL METODO MIKE FERRY",
    "tags": [
      "obiezioni",
      "multiagenzia",
      "ho",
      "già",
      "più",
      "agenzie"
    ],
    "workflowPhase": 13,
    "workflowOrder": 1357,
    "sentences": [
      "Capisco.",
      "Come sta andando finora?",
      "Chi coordina prezzo, comunicazione, feedback e negoziazione?",
      "Se il risultato non è quello che vuole, può avere senso confrontare il modello attuale con una strategia in cui una persona è chiaramente responsabile del piano."
    ],
    "microSentences": [
      "Come sta andando finora?",
      "Chi coordina prezzo",
      "comunicazione",
      "feedback e negoziazione?",
      "Se il risultato non è quello che vuole",
      "può avere senso confrontare il modello attuale con una strategia in cui una persona è chiaramente responsabile del piano."
    ],
    "keywords": [
      "NON CRITICARE",
      "MISURA RISULTATI",
      "MOSTRA TRADE-OFF",
      "OBIEZIONI",
      "MULTIAGENZIA",
      "GIÀ",
      "PIÙ"
    ],
    "memoryMap": [
      "ASCOLTA",
      "RICONOSCI",
      "ISOLA",
      "RISPONDI",
      "DOMANDA",
      "CHIUDI"
    ],
    "objections": [
      "Più agenzie significa più clienti."
    ],
    "followUps": [
      "Può aumentare i punti di contatto, ma non sempre aumenta controllo e coerenza. Valutiamo dati reali: richieste, visite, feedback e offerte ottenute finora."
    ],
    "difficulty": 2,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "auditStatus": "ADATTAMENTO F1 DA VERIFICARE CON CONTESTO",
    "reviewedAt": "2026-09-19"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "fonte primaria/ufficiale come base strutturale",
    "verificationStatus": "ADATTAMENTO FEDELE ALLA STRUTTURA MFO — ITALIA",
    "difficulty": 4,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Abbiamo chiarito il motivo della vendita, la tempistica, il prezzo, il piano e le condizioni di lavoro.",
      "Se ciò che abbiamo definito le sembra corretto, il passo successivo è formalizzare l'incarico e iniziare il lavoro.",
      "Procediamo?"
    ],
    "microSentences": [
      "Abbiamo chiarito il motivo della vendita",
      "la tempistica",
      "il prezzo",
      "il piano e le condizioni di lavoro.",
      "Se ciò che abbiamo definito le sembra corretto",
      "il passo successivo è formalizzare l'incarico e iniziare il lavoro.",
      "Procediamo?"
    ],
    "id": "lp-10-chiusura",
    "workflowPhase": 14,
    "workflowOrder": 1400,
    "subcategory": "14 · Chiusura",
    "title": "LP-10 · Richiesta dell'incarico",
    "purpose": "Passare dalla presentazione alla decisione senza aggiungere una nuova presentazione.",
    "usage": "Quando motivazione, prezzo, piano e condizioni sono chiariti.",
    "italianAdapted": "Abbiamo chiarito il motivo della vendita, la tempistica, il prezzo, il piano e le condizioni di lavoro. Se ciò che abbiamo definito le sembra corretto, il passo successivo è formalizzare l'incarico e iniziare il lavoro. Procediamo?",
    "roleplayClient": "Vorrei pensarci ancora.",
    "roleplayAgent": "Va bene. Prima di interrompere, mi dica qual è l'unico punto che oggi le impedisce di procedere. Se è risolvibile, lo affrontiamo; se non lo è, sapremo entrambi dove siamo.",
    "keywords": [
      "RIEPILOGA",
      "PASSO SUCCESSIVO",
      "PROCEDIAMO",
      "ISOLA BLOCCO"
    ],
    "memoryMap": [
      "RIEPILOGA",
      "CHIEDI",
      "SILENZIO",
      "ISOLA EVENTUALE OBIEZIONE",
      "RICHIEDI"
    ],
    "objections": [
      "Voglio pensarci"
    ],
    "followUps": [
      "Qual è l'unico punto che impedisce di procedere?"
    ],
    "source": "Mike Ferry Organization",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf"
  },
  {
    "category": "PERCORSO ACQUISIZIONE",
    "sourceType": "adattamento operativo italiano",
    "verificationStatus": "ADATTAMENTO ITALIA — STRUTTURA MFO",
    "difficulty": 3,
    "audioSettings": {
      "trainerVoice": "it-IT-female-preferred",
      "clientVoice": "it-IT-alternate",
      "rate": 1,
      "shadowRates": [
        0.75,
        0.85,
        0.9,
        1,
        1.05
      ],
      "loops": [
        1,
        3,
        5,
        10,
        999
      ]
    },
    "reviewedAt": "2026-09-19",
    "auditStatus": "NUOVO MODULO OPERATIVO VERIFICATO SU FONTI UFFICIALI",
    "sentences": [
      "Perfetto.",
      "Ora formalizziamo ciò che abbiamo concordato.",
      "Le mostro con calma durata, prezzo, provvigione, condizioni operative, eventuale esclusiva e gli altri elementi dell'incarico.",
      "Prima di firmare verifichiamo che tutti i proprietari e decisori abbiano compreso le condizioni e che non restino domande aperte.",
      "Se è tutto chiaro, procediamo con le firme."
    ],
    "microSentences": [
      "Perfetto.",
      "Ora formalizziamo ciò che abbiamo concordato.",
      "Le mostro con calma durata",
      "provvigione",
      "condizioni operative",
      "eventuale esclusiva e gli altri elementi dell'incarico.",
      "Prima di firmare verifichiamo che tutti i proprietari e decisori abbiano compreso le condizioni e che non restino domande aperte.",
      "Se è tutto chiaro",
      "procediamo con le firme."
    ],
    "id": "lp-11-firma",
    "workflowPhase": 15,
    "workflowOrder": 1500,
    "subcategory": "15 · Firma",
    "title": "LP-11 · Formalizzazione dell'incarico",
    "purpose": "Trasformare la decisione verbale in incarico correttamente compilato e compreso.",
    "usage": "Dopo il sì del proprietario.",
    "italianAdapted": "Perfetto. Ora formalizziamo ciò che abbiamo concordato. Le mostro con calma durata, prezzo, provvigione, condizioni operative, eventuale esclusiva e gli altri elementi dell'incarico. Prima di firmare verifichiamo che tutti i proprietari e decisori abbiano compreso le condizioni e che non restino domande aperte. Se è tutto chiaro, procediamo con le firme.",
    "roleplayClient": "Posso firmare solo io anche se l'immobile è cointestato?",
    "roleplayAgent": "Prima di procedere verifichiamo titolarità e soggetti necessari. Non improvvisiamo su aspetti contrattuali: l'incarico deve essere coerente con la situazione reale e con la normativa applicabile.",
    "keywords": [
      "DURATA",
      "PREZZO",
      "PROVVIGIONE",
      "ESCLUSIVA",
      "DECISORI",
      "FIRME"
    ],
    "memoryMap": [
      "RIEPILOGA CONDIZIONI",
      "VERIFICA SOGGETTI",
      "DOMANDE",
      "FIRME",
      "COPIA"
    ],
    "objections": [
      "Cointestazione",
      "Dubbi sulle condizioni"
    ],
    "followUps": [
      "È tutto chiaro prima della firma?"
    ],
    "source": "Adattamento operativo italiano + struttura MFO",
    "sourceUrl": "https://assets-prod.mikeferry.com/wp-content/uploads/scripts/2023/01%2025%202023%20Listing%20Presentation%20Script.pdf"
  }
];
