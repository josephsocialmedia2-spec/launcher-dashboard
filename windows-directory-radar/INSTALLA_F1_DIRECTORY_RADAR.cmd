@echo off
chcp 65001 >nul
setlocal
title F1 Directory Radar - Installazione

set "BASE=%LOCALAPPDATA%\F1DirectoryRadar"
set "CORE=%BASE%\f1_directory_radar.py"
set "SCRIPT=%BASE%\f1_directory_radar_mobile.py"
set "SYNC=%BASE%\f1_directory_mobile_sync.py"
set "TASKS=%BASE%\install_tasks.ps1"
set "RAW=https://raw.githubusercontent.com/josephsocialmedia2-spec/launcher-dashboard/main/windows-directory-radar"

echo ============================================================
echo F1 DIRECTORY RADAR - PAGINEBIANCHE + PAGINEGIALLE + F1 OS
echo ============================================================
echo.

where py >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Python non trovato.
  echo Installa Python 3 da python.org e seleziona Add Python to PATH.
  pause
  exit /b 1
)

if not exist "%BASE%" mkdir "%BASE%"

echo [1/5] Scarico il programma aggiornato...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_directory_radar.py' -OutFile '%CORE%'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_directory_radar_mobile.py' -OutFile '%SCRIPT%'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_directory_mobile_sync.py' -OutFile '%SYNC%'; Invoke-WebRequest -UseBasicParsing '%RAW%/install_tasks.ps1' -OutFile '%TASKS%'"
if errorlevel 1 (
  echo ERRORE: download non riuscito.
  pause
  exit /b 1
)

echo [2/5] Creo ambiente Python...
if not exist "%BASE%\.venv\Scripts\python.exe" py -m venv "%BASE%\.venv"
set "PY=%BASE%\.venv\Scripts\python.exe"
"%PY%" -m pip install --disable-pip-version-check --upgrade pip >nul
"%PY%" -m pip install --disable-pip-version-check selenium openpyxl
if errorlevel 1 (
  echo ERRORE: installazione dipendenze non riuscita.
  pause
  exit /b 1
)

echo [3/5] Verifico la sintassi...
"%PY%" -m py_compile "%CORE%" "%SCRIPT%" "%SYNC%"
if errorlevel 1 (
  echo ERRORE: il programma scaricato non supera il controllo sintattico.
  pause
  exit /b 1
)

echo [4/5] Creo icone Desktop e attivita automatiche...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TASKS%"
if errorlevel 1 (
  echo ERRORE: configurazione Task Scheduler non riuscita.
  pause
  exit /b 1
)

echo [5/5] Creo subito un primo report con i dati gia presenti sul PC...
"%PY%" "%SCRIPT%" --no-browser

echo.
echo ============================================================
echo INSTALLAZIONE COMPLETATA
echo ============================================================
echo Ogni notte alle 02:30:
echo - legge gli annunci F1 aggiornati;
echo - ricava Comune, via e civico;
echo - aggiorna PagineBianche e PagineGialle quando accessibili;
echo - incrocia i contatti pubblici con le vie degli annunci;
echo - prepara il report per la scrivania;
echo - sincronizza i risultati in F1 OS Mobile Ready se il cloud F1 e configurato.
echo.
echo Alle 08:00 apre automaticamente il report.
echo.
echo Se compare CAPTCHA il programma NON lo aggira:
echo salva il blocco e continua con le altre fonti.
echo.
echo Sul Desktop trovi:
echo - F1 - AGGIORNA NUMERI E ANNUNCI
echo - F1 - REPORT ACQUISIZIONE
echo - F1 - IMPORTA ELENCHI
echo.
echo Lascia il PC acceso e il tuo utente Windows connesso durante la notte.
echo ============================================================
pause
endlocal
