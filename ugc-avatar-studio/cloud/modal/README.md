# UGC Avatar Studio — Modal cloud

Questa cartella contiene il deployment cloud serverless alternativo a Hugging Face.

## Architettura

Browser → FastAPI pubblico su Modal → funzione GPU T4 → Piper TTS italiano → SadTalker → FFmpeg → MP4 1080×1920.

Il computer dell'utente non esegue Python, SadTalker, Piper, FFmpeg o modelli AI.

## File

- `modal_app.py`: applicazione completa Modal, pagina web, API e worker GPU.
- Workflow: `.github/workflows/ugc-avatar-modal-deploy.yml`.

## Endpoint

Una volta eseguito il deploy:

- `GET /` — interfaccia web.
- `GET /health` — stato servizio.
- `GET /api/diagnostics` — diagnostica.
- `POST /api/render` — upload foto + script + velocità + consenso, risposta MP4.

## Limiti operativi impostati

- GPU: T4.
- `max_containers=1` per il worker GPU.
- `min_containers=0`: nessuna GPU tenuta accesa a riposo.
- scaledown dopo 30 secondi di inattività.
- Foto massimo 10 MB.
- Testo massimo 1500 caratteri.
- File temporanei eliminati alla fine di ogni richiesta.

Queste impostazioni riducono il consumo, ma il credito gratuito Modal resta soggetto alle condizioni e ai limiti del piano Modal dell'account.

## Deploy GitHub Actions

Il workflow usa le credenziali ufficiali Modal:

- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`

Entrambe devono essere GitHub Repository Secrets. Non devono comparire nel codice o nei log.

Il deploy viene eseguito con:

`modal deploy ugc-avatar-studio/cloud/modal/modal_app.py --name ugc-avatar-studio`

Dopo il deploy il workflow recupera il vero URL pubblico Modal e verifica `/health`.


## Automazione end-to-end con publisher social esistente

Input operativo:

1. immagine avatar;
2. discorso/testo.

Il backend esegue automaticamente:

- validazione input;
- Piper TTS italiano;
- SadTalker;
- sottotitoli;
- FFmpeg 1080x1920;
- controllo stream audio/video e durata;
- generazione automatica titolo, caption e hashtag;
- archiviazione persistente su Modal Volume;
- creazione job `ready_for_publish`;
- esposizione outbox per `open-social-scheduler`.

Endpoint:

- `POST /api/render`: accetta soltanto `photo` e `script`.
- `GET /api/jobs/{job_id}`: report completo.
- `GET /api/jobs/{job_id}/video`: MP4 archiviato.
- `GET /api/outbox`: job pronti al publisher.
- `GET /api/history`: storico.
- `GET /api/diagnostics`: stato pipeline.

### Secrets

GitHub Actions richiede soltanto:

- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`

I token social restano nel repository `open-social-scheduler`, dove il backend dichiarato è `direct_api`. Non vengono copiati in Modal.
