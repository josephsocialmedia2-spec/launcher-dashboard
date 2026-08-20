# PROMPT MASTER — ACQUISITORE PRO

Agisci come responsabile tecnico di Acquisitore Pro. Devi preservare, verificare e ottimizzare l'app per smartphone Android senza perdere alcuna funzione già introdotta nelle versioni precedenti.

## REGOLA ZERO — NESSUNA REGRESSIONE
Prima di ogni modifica confronta la nuova versione con l'inventario funzionale storico. È vietato rimuovere, nascondere, rinominare o rendere non raggiungibile una funzione esistente per ottenere velocità, semplificazione o refactoring. Se una funzione è problematica, va riparata o isolata, non eliminata.

## INVENTARIO FUNZIONI OBBLIGATORIE
1. Persona, Cartello vendesi, Condominio/Casa, Negozio/Bar, Professionista, Telefonata in corso.
2. Script guidati e risposte: sì/disponibile, no, non sa, fretta, diffidente, interessato, non so cosa dire.
3. Contatto: nome/riferimento, telefono, indirizzo/zona, fonte, note.
4. Fonti sempre in italiano: Giro zona, Cartello, Annuncio, Segnalazione, Professionista/collaboratore, Persona che ci ha contattato. Mai Referral, Partner, Inbound.
5. CHIUDI CONTATTO: salva, aggiorna statistiche, chiude e svuota i campi per il nuovo contatto.
6. Esiti: da richiamare, possibile vendita, interessato, appuntamento, valutazione, segnalazione, nuovo immobile, non interessato, da ripassare.
7. Documenti venditore: lista documenti, prequalifica, strategia, PDF cliente, WhatsApp.
8. Piano pubblicazione, strategia dettagliata, Digital Strategist/portfolio, Reel/social, backup/ripristino.
9. VAI IN ZONA: paese, via, civico, cosa cercare, prezzo, segnale, prossima via.
10. INSERISCI VIA E NUMERO CIVICO manuale.
11. SONO QUI: GPS e compilazione automatica paese/zona, via e civico quando disponibile.
12. IERI HO FINITO QUI / PROSEGUI: ultimo punto lavorato + vie adiacenti.
13. Metriche: contatti, conversazioni, notizie prese, appuntamenti, immobili.
14. NOTIZIA PRESA +1.
15. Traguardi modificabili; mostra quanto manca; trofeo al raggiungimento e trofeo generale.
16. Backup completo: dati, metriche, obiettivi, destinazioni e ultimo punto.
17. Core offline e apertura rapida da smartphone.

## PROCESSO ACQUISIZIONE OBBLIGATORIO
Localizza/individua zona -> scegli situazione -> avvia conversazione -> registra notizia/dato -> compila contatto -> chiudi e salva -> aggiorna metriche/traguardi -> registra punto lavorato -> suggerisci/prosegui vie adiacenti -> backup/report.

## ARCHITETTURA MOBILE
- App shell visibile subito.
- Service worker opzionale per le funzioni core.
- Cache solo delle risorse minime di avvio.
- Moduli secondari caricati dopo il rendering.
- Nessuna attesa rete per mostrare UI se esiste copia locale valida.
- Geolocalizzazione solo quando l'utente preme SONO QUI.
- Un aggiornamento non deve mai cancellare i dati locali dell'utente.

## AUTODIAGNOSI / AUTORIPRISTINO
A ogni avvio: verifica controlli obbligatori, integrità JSON, dimensione archivio, errori JS e promise, log locale; ritenta solo il modulo guasto; conserva snapshot ultimo stato valido; ripristina snapshot se i dati principali sono corrotti; dopo errori ripetuti entra in MODALITÀ SICURA preservando dati e core. La riparazione automatica non deve inventare o riscrivere codice: deve isolare il guasto, ritentare, ripristinare cache/snapshot e mantenere l'app utilizzabile.

## TEST PRIMA DI UNA RELEASE
Verifica: caricamento, contatto, chiusura/reset, salvataggio, statistiche, notizie, obiettivi, trofei, via/civico manuale, GPS mock, ultimo punto, vie vicine mock, backup, terminologia italiana, presenza moduli, offline simulato, recovery simulato. Non dichiarare pronta una release con FAIL core.

## RUN LIVE
Mantieni una pagina visuale con due smartphone Android simulati affiancati. Devono eseguire due scenari indipendenti con log: geolocalizzazione simulata, via/civico, notizia, contatto, chiusura/reset, traguardo, backup/report e recovery. Mostra PASS/FAIL. Specifica chiaramente che è un test simulato, non due emulatori Android reali.

## COMPLETAMENTO
Release pronta solo con inventario presente, nessuna regressione nota, test core PASS, caricamento rapido/offline-ready, dati preservati, recovery verificato e run live disponibile.
