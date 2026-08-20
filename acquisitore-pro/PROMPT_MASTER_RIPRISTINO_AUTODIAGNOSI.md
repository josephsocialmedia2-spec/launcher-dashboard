# PROMPT MASTER — ACQUISITORE PRO

Agisci come responsabile tecnico di Acquisitore Pro. Devi preservare, verificare e ottimizzare l'app per smartphone Android senza perdere alcuna funzione già introdotta nelle versioni precedenti.

## REGOLA ZERO — NESSUNA REGRESSIONE
Prima di ogni modifica devi confrontare la nuova versione con l'inventario funzionale storico. È vietato rimuovere, nascondere, rinominare o rendere non raggiungibile una funzione esistente per ottenere velocità, semplificazione o refactoring. Se una funzione è problematica, va riparata o isolata, non eliminata.

## INVENTARIO FUNZIONI OBBLIGATORIE
1. Schermata operativa: Persona, Cartello vendesi, Condominio/Casa, Negozio/Bar, Professionista, Telefonata in corso.
2. Script guidati e pulsanti risposta: sì/disponibile, no, non sa, fretta, diffidente, interessato, non so cosa dire.
3. Contatto in corso: nome/riferimento, telefono, indirizzo/zona, fonte, note.
4. Fonti in italiano: Giro zona, Cartello, Annuncio, Segnalazione, Professionista/collaboratore, Persona che ci ha contattato. Mai mostrare Referral, Partner, Inbound.
5. Chiusura contatto: salva, memorizza, aggiorna statistiche, chiude la scheda e lascia tutti i campi vuoti per il contatto successivo.
6. Esiti: da richiamare, possibile vendita, interessato, appuntamento, valutazione, segnalazione, nuovo immobile, non interessato, da ripassare.
7. Documenti per vendere casa: lista documenti, prequalifica, strategia vendita, PDF cliente, condivisione WhatsApp.
8. Piano pubblicazione, strategia dettagliata, Digital Strategist/portfolio, Reel/social, backup/ripristino.
9. VAI IN ZONA: elenco destinazioni con paese, via, civico, cosa cercare, prezzo, segnale; prossima via.
10. INSERISCI VIA E NUMERO CIVICO manuale.
11. SONO QUI: geolocalizzazione GPS e compilazione automatica paese/zona, via e civico quando disponibile.
12. IERI HO FINITO QUI / PROSEGUI: memorizza l'ultimo punto lavorato e propone vie adiacenti senza ricominciare da zero.
13. Metriche: contatti, conversazioni, notizie prese, appuntamenti, immobili e dati operativi impostati nell'app.
14. Pulsante NOTIZIA PRESA +1.
15. Traguardi modificabili; mostra sempre quanto manca; al raggiungimento mostra TROFEO; al superamento complessivo mostra trofeo generale.
16. Backup completo dei dati locali, comprese destinazioni, ultimo punto, metriche e obiettivi.
17. Funzionamento offline del core e apertura rapida da smartphone.

## PROCESSO DI ACQUISIZIONE DA VERIFICARE NELL'APP
Il flusso operativo deve essere continuo: localizza/individua zona -> scegli situazione -> avvia conversazione -> registra notizia/dato -> compila contatto -> chiudi e salva -> aggiorna metriche/traguardi -> registra punto lavorato -> suggerisci/prosegui vie adiacenti -> backup/report. Nessuna fase deve richiedere di ricordarsi manualmente dove si era arrivati.

## ARCHITETTURA MOBILE OBBLIGATORIA
- App shell visibile subito.
- Service worker opzionale per il core.
- Cache solo per risorse minime di avvio.
- Moduli secondari caricati dopo il rendering.
- Nessuna attesa di rete per mostrare la UI se esiste una copia locale valida.
- Geolocalizzazione e reverse geocoding solo su pressione di SONO QUI.
- Nessun aggiornamento può cancellare localStorage/IndexedDB dell'utente.

## AUTODIAGNOSI E AUTORIPRISTINO
A ogni avvio esegui automaticamente:
- verifica presenza dei controlli/funzioni obbligatorie;
- verifica integrità JSON dei dati locali;
- verifica spazio/dimensione dati e compattazione non distruttiva;
- intercetta errori JavaScript e promise rejection;
- registra un log diagnostico locale;
- se un modulo non carica, ritenta solo quel modulo;
- se il service worker/cache è incoerente, ripristina solo la cache dell'app, mai i dati utente;
- conserva snapshot dell'ultimo stato dati valido;
- se i dati principali risultano corrotti, ripristina lo snapshot valido e segnala l'azione;
- dopo più errori consecutivi attiva MODALITÀ SICURA: core operativo, niente moduli non essenziali, dati preservati.

## TEST OBBLIGATORI PRIMA DI DICHIARARE LA RELEASE PRONTA
Verifica automaticamente: caricamento app, campi contatto, chiusura/reset, salvataggio, statistiche, notizie, obiettivi, trofei, via/civico manuale, SONO QUI (mock GPS nei test), ultimo punto, vie vicine (mock), backup, terminologia italiana, presenza moduli, comportamento offline simulato e recovery da errore simulato.

## RUN LIVE
Mantieni una pagina di test visuale con due smartphone Android simulati affiancati. Devono eseguire automaticamente due scenari distinti e mostrare log in tempo reale: inserimento dati, geolocalizzazione simulata, via/civico, notizia presa, chiusura contatto, aggiornamento traguardo, report/backup e autoripristino simulato. La pagina deve mostrare PASS/FAIL per ogni funzione. Non dichiarare 'pronto' se esistono FAIL nei test core.

## CRITERIO DI COMPLETAMENTO
Una release è pronta solo quando: inventario completo presente, nessuna regressione nota, test core PASS, caricamento non dipende dalla rete quando la cache è disponibile, dati preservati, recovery verificato, run live disponibile.
