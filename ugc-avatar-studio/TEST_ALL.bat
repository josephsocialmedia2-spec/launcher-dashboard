@echo off
setlocal EnableExtensions
cd /d %~dp0

if not exist .venv\Scripts\python.exe (
  echo [ERRORE] Ambiente backend .venv mancante.
  exit /b 1
)

.venv\Scripts\python.exe -m compileall -q app services providers tests scripts
if errorlevel 1 exit /b 1

.venv\Scripts\python.exe -m pytest -q
if errorlevel 1 exit /b 1

.venv\Scripts\python.exe -c "from app.main import app; from services.hardware import diagnostics; print('FASTAPI_IMPORT_OK'); print(diagnostics())"
if errorlevel 1 exit /b 1

if not exist models\tts\it_IT-paola-medium.onnx (
  echo [ERRORE] Modello Piper ONNX mancante.
  exit /b 1
)
if not exist models\tts\it_IT-paola-medium.onnx.json (
  echo [ERRORE] Config Piper mancante.
  exit /b 1
)

.venv\Scripts\python.exe scripts\verify_piper.py
if errorlevel 1 exit /b 1

where ffmpeg >nul 2>nul || (
  echo [ERRORE] FFmpeg non trovato nel PATH.
  exit /b 1
)
where ffprobe >nul 2>nul || (
  echo [ERRORE] FFprobe non trovato nel PATH.
  exit /b 1
)

.venv\Scripts\python.exe scripts\verify_ffmpeg.py
if errorlevel 1 exit /b 1

if not exist external\SadTalker\.venv\Scripts\python.exe (
  echo [ERRORE] Ambiente SadTalker mancante.
  exit /b 1
)
if not exist external\SadTalker\inference.py (
  echo [ERRORE] inference.py SadTalker mancante.
  exit /b 1
)
if not exist external\SadTalker\checkpoints\SadTalker_V0.0.2_512.safetensors (
  echo [ERRORE] Checkpoint SadTalker 512 mancante.
  exit /b 1
)

external\SadTalker\.venv\Scripts\python.exe -c "import torch, numpy, scipy, cv2; print('SADTALKER_IMPORTS_OK'); print('torch', torch.__version__); print('cuda', torch.cuda.is_available())"
if errorlevel 1 exit /b 1

echo [OK] Backend, Piper reale, FFmpeg reale e installazione SadTalker verificati.
exit /b 0
