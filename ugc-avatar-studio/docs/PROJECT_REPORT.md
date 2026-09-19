# Project Report — UGC Avatar Studio
Data audit: 19 settembre 2026

L'MVP implementa foto → voce italiana → talking-head → sottotitoli → video verticale. Non viene dichiarata parità completa con HeyGen.

Stack: HTML/CSS/JS, FastAPI, SQLite, Piper, SadTalker, FFmpeg.

Criterio di accettazione sulla macchina target: Piper genera un WAV reale; SadTalker genera un MP4 reale; FFmpeg produce 1080×1920 con audio; ffprobe valida il file; l'interfaccia locale consente il download.
