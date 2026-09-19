# F1 Script Trainer 2.0

PWA mobile-first per memorizzare e simulare l'intero processo di acquisizione immobiliare, dalla creazione del lead alla firma dell'incarico.

## Architettura

- `index.html` — home, allenamento del giorno, libreria e progressi.
- `acquisition.html` — corso lineare in 15 fasi con 17 moduli primari.
- `simulator.html` — role play con cliente virtuale, microfono, trascrizione quando disponibile, telecamera/specchio e registrazione locale.
- `data/scripts.js` — 78 schede strutturate con fonti, fasi, frasi, micro-frasi, parole chiave e mappe mentali.
- `AUDIT.md` — inventario e audit script per script.
- `SOURCES.md` — registro fonti MFO/Mike Ferry Italy e riferimenti italiani.
- `service-worker.js` — cache offline delle risorse essenziali.
- `manifest.webmanifest` — installazione PWA e scorciatoie.

## Metodo di apprendimento

Ascolta → leggi → ripeti → nascondi → ripeti → role play → correggi → ripeti → simula → memorizza.

Il corso implementa:
- ascolto 1/3/5/10/loop;
- shadowing 0.75x / 0.85x / 0.90x / 1.00x / 1.05x;
- frase-per-frase;
- catena di memoria;
- parole chiave;
- mappa mentale;
- stati NUOVO / DA IMPARARE / IN APPRENDIMENTO / QUASI MEMORIZZATO / MEMORIZZATO / DA RIPASSARE;
- contatori ascolti, ripetizioni, tentativi e role play;
- simulazione guidata, assistita, memoria ed esame;
- role play casuale sulle obiezioni;
- appuntamento completo;
- telecamera come specchio;
- registrazione locale e download sessione.

## Telecamera e microfono

Sono richiesti solo dopo un comando esplicito dell'utente. I media non vengono caricati automaticamente. Se il browser supporta `FaceDetector`, il trainer può produrre solo indicatori osservabili di centratura/stabilità dell'inquadratura; non effettua riconoscimento di identità, diagnosi emotive o punteggi di personalità.

SpeechRecognition/Web Speech è usato quando disponibile. In caso contrario resta operativo il fallback: registrazione locale + trascrizione manuale.

## Copyright

Il progetto non sostituisce né ripubblica il Mike Ferry Script Book. Le fonti ufficiali sono usate per verificare la struttura. I testi operativi dell'app sono adattamenti di allenamento marcati con stato di provenienza.

## Uso legale in Italia

Gli script di contatto non autorizzano di per sé attività di marketing. Verificare consenso/base giuridica, RPO e normativa applicabile prima di effettuare chiamate promozionali.

## Installazione

iPhone: Safari → Condividi → Aggiungi alla schermata Home.
Android: Chrome → menu → Installa app / Aggiungi a schermata Home.