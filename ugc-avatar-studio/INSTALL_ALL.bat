@echo off
setlocal EnableExtensions
cd /d %~dp0

echo ==============================================
echo       UGC AVATAR STUDIO - INSTALL ALL
echo ==============================================

where winget >nul 2>nul || (
  echo [ERRORE] winget non disponibile. Aggiorna App Installer dal Microsoft Store.
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
  call :refresh_path
)
where git >nul 2>nul || (
  echo [ERRORE] Git non disponibile dopo installazione.
  exit /b 1
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
  call :refresh_path
)
where ffmpeg >nul 2>nul || (
  echo [ERRORE] FFmpeg non disponibile dopo installazione.
  exit /b 1
)
where ffprobe >nul 2>nul || (
  echo [ERRORE] FFprobe non disponibile dopo installazione FFmpeg.
  exit /b 1
)

py -3.11 -c "import sys; print(sys.version)" >nul 2>nul
if errorlevel 1 (
  winget install -e --id Python.Python.3.11 --scope user --accept-package-agreements --accept-source-agreements
  call :refresh_path
)

py -3.11 -c "import sys; print(sys.version)" >nul 2>nul || (
  echo [ERRORE] Python 3.11 non disponibile dopo installazione.
  exit /b 1
)

if not exist .venv (
  py -3.11 -m venv .venv
  if errorlevel 1 exit /b 1
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 exit /b 1

pip install -r requirements.txt
if errorlevel 1 exit /b 1

call DOWNLOAD_MODELS.bat
if errorlevel 1 exit /b 1

call INSTALL_SADTALKER.bat
if errorlevel 1 exit /b 1

call SELFTEST_END_TO_END.bat
if errorlevel 1 (
  echo [ERRORE] Installazione completata ma test end-to-end fallito.
  exit /b 1
)

echo.
echo ==============================================
echo  [OK] PROGRAMMA INSTALLATO E TEST E2E SUPERATO
echo ==============================================
echo Avvio: START.bat
echo URL: http://127.0.0.1:8787
echo Self-test MP4: %CD%\renders\_selftest\VIDEO_UGC_001.mp4
exit /b 0

:refresh_path
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$m=[Environment]::GetEnvironmentVariable('Path','Machine'); $u=[Environment]::GetEnvironmentVariable('Path','User'); Write-Output ($m+';'+$u)"`) do set "PATH=%%P"
exit /b 0
