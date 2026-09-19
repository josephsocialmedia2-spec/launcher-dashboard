@echo off
cd /d %~dp0
echo === UGC AVATAR STUDIO DIAGNOSTICA ===
where py
where ffmpeg
where git
where nvidia-smi
if exist .venv\Scripts\python.exe .venv\Scripts\python.exe -c "from services.hardware import diagnostics; import json; print(json.dumps(diagnostics(), indent=2))"
if exist models\tts\it_IT-paola-medium.onnx (echo TTS MODEL: OK) else (echo TTS MODEL: MANCANTE)
if exist external\SadTalker\inference.py (echo SADTALKER: OK) else (echo SADTALKER: MANCANTE)
pause
