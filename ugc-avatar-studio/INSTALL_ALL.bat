@echo off
setlocal EnableExtensions
cd /d %~dp0
where winget >nul 2>nul || (echo [ERRORE] winget non disponibile.& exit /b 1)
where git >nul 2>nul || winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
where ffmpeg >nul 2>nul || winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
py -3.11 -c "import sys" >nul 2>nul
if errorlevel 1 winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
py -3.11 -c "import sys" >nul 2>nul || (echo [ERRORE] Python 3.11 non disponibile dopo installazione. Riavvia Windows e rilancia.& exit /b 1)
if not exist .venv py -3.11 -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install piper-tts
if errorlevel 1 exit /b 1
call DOWNLOAD_MODELS.bat
if errorlevel 1 exit /b 1
call INSTALL_SADTALKER.bat
if errorlevel 1 exit /b 1
call TEST_ALL.bat
if errorlevel 1 exit /b 1
echo [OK] INSTALLAZIONE COMPLETA E TEST SUPERATI
exit /b 0
