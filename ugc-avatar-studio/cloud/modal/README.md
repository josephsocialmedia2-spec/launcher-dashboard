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
