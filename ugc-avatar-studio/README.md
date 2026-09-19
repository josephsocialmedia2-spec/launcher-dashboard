# UGC AVATAR STUDIO — MVP locale

Applicazione local-first per creare video UGC verticali da una fotografia autorizzata e uno script.

## Pipeline

Foto/avatar → Piper TTS italiano → SadTalker → sottotitoli → FFmpeg → MP4 1080×1920.

## Installazione Windows automatica

Esegui **INSTALL_ALL.bat**.

Lo script:

1. verifica/installa Git e FFmpeg;
2. prepara Python 3.11 e l'ambiente backend;
3. installa Piper TTS 1.8.0;
4. scarica la voce italiana Paola;
5. prepara Python 3.8 separato per SadTalker;
6. installa le versioni PyTorch compatibili con SadTalker;
7. scarica checkpoint e pesi GFPGAN;
8. esegue i test software;
9. genera realmente un WAV italiano;
10. verifica FFmpeg con un MP4 verticale 1080×1920;
11. esegue SadTalker con l'immagine di esempio inclusa nel progetto ufficiale;
12. produce e valida il video finale di self-test.

L'installazione viene dichiarata riuscita soltanto se esiste:

`renders\_selftest\VIDEO_UGC_001.mp4`

con video, audio, durata valida e risoluzione 1080×1920.

## Avvio normale

Esegui **START.bat**.

URL locale:

http://127.0.0.1:8787

## Test

- **TEST_ALL.bat**: compilazione, pytest, FastAPI, Piper reale, FFmpeg reale e verifica installazione SadTalker.
- **SELFTEST_END_TO_END.bat**: esegue inoltre una vera inferenza SadTalker e genera VIDEO_UGC_001.mp4.
- GitHub Actions esegue unit test Linux e integrazione Windows reale per Piper + FFmpeg.

## Sicurezza e repository

Checkpoint, modelli, ambienti virtuali, database runtime, upload e render non vengono committati.

Le immagini di test SadTalker provengono dal repository ufficiale clonato durante l'installazione. Per avatar reali utilizzare soltanto materiale per il quale si possiedono diritti e consenso.

Prima dell'uso commerciale verificare **LICENSE_NOTES.md**.

## Limite della CI cloud

I runner GitHub standard non dispongono della GPU della macchina finale e non sostituiscono il test SadTalker sul PC target. Per questo il test completo viene eseguito automaticamente da INSTALL_ALL.bat sulla macchina di utilizzo.
