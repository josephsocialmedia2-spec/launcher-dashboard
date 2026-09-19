# UGC AVATAR STUDIO — MVP locale

Applicazione local-first per creare video UGC verticali da una fotografia autorizzata e uno script.

## Pipeline
Foto/avatar → Piper TTS italiano → SadTalker → sottotitoli → FFmpeg → MP4 1080×1920.

## Installazione Windows automatica
Esegui INSTALL_ALL.bat. Lo script verifica/installa Git, FFmpeg, Python 3.11 per il backend, Python 3.8 per SadTalker, Piper, voce italiana, SadTalker e checkpoint ufficiali, quindi esegue i test.

Avvio normale: START.bat.
URL locale: http://127.0.0.1:8787

## Test
TEST_ALL.bat esegue compilazione, pytest, import FastAPI e controlli di installazione. La GitHub Action ripete i test software a ogni modifica.

## Sicurezza
Checkpoint, modelli, ambienti virtuali, database runtime, upload e render non vengono committati. Prima dell'uso commerciale verificare LICENSE_NOTES.md.

Per una sessione autonoma di installazione, debug e QA usare PROMPT_AUTONOMOUS_BUILD.md.


## VERSIONE CLOUD

È disponibile nel repository il pacchetto cloud per Hugging Face Spaces:

`cloud/hf-space/`

Architettura prevista:

Browser → Gradio/ZeroGPU → Piper TTS → SadTalker → FFmpeg → MP4 1080×1920.

La versione cloud non richiede Python, SadTalker, Piper o FFmpeg sul computer dell'utente.

### Stato deployment

- Account Hugging Face verificato: `realmediajo`.
- Cloud smoke test: OK.
- Stack runtime SadTalker/PyTorch 2.8: OK.
- URL pubblico: non ancora assegnato, perché il collegamento OAuth attuale espone lettura repository e Jobs ma non un'azione di creazione/scrittura Space.
- Jobs Hugging Face: non usati per il deployment permanente; il tentativo non distruttivo ha restituito HTTP 402 senza billing.
- Target gratuito preparato: Gradio + ZeroGPU.

Il file `cloud/hf-space/publish_space.py` crea e pubblica lo Space quando è disponibile una credenziale Hugging Face con permesso write.
