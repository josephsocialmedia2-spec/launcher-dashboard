---
title: UGC Avatar Studio
emoji: 🎬
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 5.50.0
python_version: 3.10.13
app_file: app.py
pinned: false
---

# UGC Avatar Studio Cloud

Versione cloud di UGC Avatar Studio per Hugging Face Spaces.

## Esperienza utente

1. Apri il link HTTPS pubblico.
2. Carica una foto autorizzata.
3. Inserisci il testo italiano.
4. Scegli la velocità della voce.
5. Conferma il consenso.
6. Premi **Genera video**.
7. Attendi la coda Gradio/ZeroGPU.
8. Guarda l'anteprima e scarica l'MP4.

## Pipeline

Piper TTS → SadTalker → sottotitoli → FFmpeg → MP4 1080×1920.

## Hardware

Questa variante è progettata per Hugging Face **Gradio + ZeroGPU**. Il rendering GPU viene richiesto solo durante la funzione di generazione tramite `@spaces.GPU`.

## Privacy

Upload e render sono temporanei e vengono salvati solo nello storage effimero del runtime. Nessuna foto utente viene committata nel repository.
