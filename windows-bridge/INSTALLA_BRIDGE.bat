@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%LOCALAPPDATA%\F1Bridge"
set "VENV=%ROOT%\.venv"
set "RAW=https://raw.githubusercontent.com/josephsocialmedia2-spec/launcher-dashboard/main/windows-bridge"

echo =============================================================
echo F1 IMMOBILIARE - INSTALLA BRIDGE TELEFONO ^<^> PC ^<^> OLLAMA
echo =============================================================

where py >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Python non trovato. Installa Python e riavvia questo file.
  pause
  exit /b 1
)

if not exist "%ROOT%" mkdir "%ROOT%"
if not exist "%VENV%\Scripts\python.exe" py -3 -m venv "%VENV%"
"%VENV%\Scripts\python.exe" -m pip install --upgrade pip
"%VENV%\Scripts\python.exe" -m pip install openpyxl selenium

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%RAW%/f1_ollama_bridge.py' -OutFile '%ROOT%\f1_ollama_bridge.py'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_captcha_notify.py' -OutFile '%ROOT%\f1_captcha_notify.py'; Invoke-WebRequest -UseBasicParsing '%RAW%/configura_bridge.pyw' -OutFile '%ROOT%\configura_bridge.pyw'"
if errorlevel 1 (
  echo ERRORE durante il download dei file F1.
  pause
  exit /b 1
)

>"%ROOT%\AVVIA_BRIDGE.cmd" echo @echo off
>>"%ROOT%\AVVIA_BRIDGE.cmd" echo start "F1 Bridge" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_ollama_bridge.py" --watch

>"%ROOT%\CONFIGURA_BRIDGE.cmd" echo @echo off
>>"%ROOT%\CONFIGURA_BRIDGE.cmd" echo start "F1 Config" "%VENV%\Scripts\pythonw.exe" "%ROOT%\configura_bridge.pyw"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $desk=[Environment]::GetFolderPath('Desktop'); $s=$ws.CreateShortcut((Join-Path $desk 'F1 - Configura Sync e Ollama.lnk')); $s.TargetPath='%ROOT%\CONFIGURA_BRIDGE.cmd'; $s.WorkingDirectory='%ROOT%'; $s.Save(); $startup=[Environment]::GetFolderPath('Startup'); $a=$ws.CreateShortcut((Join-Path $startup 'F1 Bridge Contatti.lnk')); $a.TargetPath='%ROOT%\AVVIA_BRIDGE.cmd'; $a.WorkingDirectory='%ROOT%'; $a.Save()"

if not exist "%USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI" mkdir "%USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI"

start "F1 Config" "%VENV%\Scripts\pythonw.exe" "%ROOT%\configura_bridge.pyw"
start "F1 Bridge" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_ollama_bridge.py" --watch

echo.
echo INSTALLAZIONE COMPLETATA.
echo - Icona Desktop: F1 - Configura Sync e Ollama
 echo - Bridge avviato automaticamente a ogni accesso Windows
 echo - Importa CSV/XLSX in: %USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI
 echo - Log: %USERPROFILE%\Documents\F1_Bridge\bridge.log
 echo.
pause
endlocal
