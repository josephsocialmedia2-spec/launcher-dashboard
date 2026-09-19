@echo off
setlocal EnableExtensions
cd /d %~dp0
if not exist .venv\Scripts\python.exe exit /b 1
.venv\Scripts\python.exe -m compileall -q app services providers tests
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -m pytest -q
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -c "from app.main import app; from services.hardware import diagnostics; print('FastAPI OK'); print(diagnostics())"
if errorlevel 1 exit /b 1
if not exist models\tts\it_IT-paola-medium.onnx exit /b 1
if not exist models\tts\it_IT-paola-medium.onnx.json exit /b 1
if not exist external\SadTalker\.venv\Scripts\python.exe exit /b 1
if not exist external\SadTalker\inference.py exit /b 1
if not exist external\SadTalker\checkpoints\SadTalker_V0.0.2_512.safetensors exit /b 1
where ffmpeg >nul 2>nul || exit /b 1
echo [OK] Test software e installazione superati.
exit /b 0
