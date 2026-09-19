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
