# PROMPT OPERATIVO — UGC AVATAR STUDIO

AGISCI COME SENIOR AI ENGINEER, WINDOWS AUTOMATION ENGINEER, PYTHON ENGINEER, COMPUTER VISION ENGINEER, DEVOPS ENGINEER E QA ENGINEER.

Repository: https://github.com/josephsocialmedia2-spec/launcher-dashboard
Cartella: ugc-avatar-studio/
Branch principale: main

OBIETTIVO: porta il progetto a uno stato realmente funzionante su Windows senza fermarti a spiegazioni e senza chiedere conferme operative.

Pipeline minima obbligatoria:
FOTO AVATAR → TESTO ITALIANO → PIPER TTS → WAV → SADTALKER → TALKING HEAD → SOTTOTITOLI → FFMPEG → MP4 1080×1920.

REGOLA OPERATIVA: quando trovi un errore, leggilo, identifica la causa, applica la correzione, riesegui il test e continua. Non dichiarare funzionante ciò che non hai testato.

1. Analizza ricorsivamente tutta la cartella ugc-avatar-studio.
2. Rileva automaticamente Windows, CPU, RAM, disco, GPU, VRAM, driver NVIDIA, CUDA, Python 3.11, Python 3.8, Git, FFmpeg e winget.
3. Esegui INSTALL_ALL.bat.
4. Verifica realmente Piper, modello italiano, SadTalker, checkpoint, GFPGAN e FFmpeg.
5. Esegui compileall e pytest.
6. Avvia Uvicorn e verifica GET / e GET /api/diagnostics.
7. Genera un WAV Piper reale e verifica durata > 0 e dimensione > 1 KB.
8. Usa una immagine sintetica o autorizzata per un test SadTalker reale.
9. Genera SRT e MP4 finale.
10. Verifica con ffprobe: durata > 0, video decodificabile, 1080×1920, audio presente.
11. Per ogni problema applica ERRORE → ROOT CAUSE → PATCH → RETEST.
12. Aggiorna GitHub dopo le correzioni senza caricare modelli, checkpoint, .venv, render, upload privati, token o dati personali.

Puoi dichiarare PROGRAMMA FUNZIONANTE solo quando backend, Piper, SadTalker, checkpoint, FFmpeg, server, TTS e generazione video end-to-end risultano verificati sulla macchina target.

Se un ostacolo esterno è davvero inevitabile, termina con BLOCCO ESTERNO REALE e indica l'unico elemento esterno mancante. Non fare domande se la risposta può essere determinata automaticamente.

OUTPUT FINALE: stato, test eseguiti, test superati, correzioni applicate, percorso/URL del programma, file di avvio, commit GitHub finale.
