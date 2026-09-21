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

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%RAW%/f1_ollama_bridge.py' -OutFile '%ROOT%\f1_ollama_bridge.py'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_captcha_notify.py' -OutFile '%ROOT%\f1_captcha_notify.py'; Invoke-WebRequest -UseBasicParsing '%RAW%/configura_bridge.pyw' -OutFile '%ROOT%\configura_bridge.pyw'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_chatgpt_uploader.py' -OutFile '%ROOT%\f1_chatgpt_uploader.py'"
if errorlevel 1 (
  echo ERRORE durante il download dei file F1.
  pause
  exit /b 1
)

>"%ROOT%\AVVIA_BRIDGE.cmd" echo @echo off
>>"%ROOT%\AVVIA_BRIDGE.cmd" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing '%RAW%/f1_chatgpt_uploader.py' -OutFile '%ROOT%\f1_chatgpt_uploader.py.tmp'; Move-Item -Force '%ROOT%\f1_chatgpt_uploader.py.tmp' '%ROOT%\f1_chatgpt_uploader.py' } catch {}"
>>"%ROOT%\AVVIA_BRIDGE.cmd" echo start "F1 Bridge" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_ollama_bridge.py" --watch
>>"%ROOT%\AVVIA_BRIDGE.cmd" echo start "F1 ChatGPT Uploader" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_chatgpt_uploader.py" --serve

>"%ROOT%\AGGIORNA_BRIDGE.cmd" echo @echo off
>>"%ROOT%\AGGIORNA_BRIDGE.cmd" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.CommandLine -like '*f1_chatgpt_uploader.py*' -or $_.CommandLine -like '*f1_ollama_bridge.py*' } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
>>"%ROOT%\AGGIORNA_BRIDGE.cmd" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%RAW%/f1_chatgpt_uploader.py' -OutFile '%ROOT%\f1_chatgpt_uploader.py'; Invoke-WebRequest -UseBasicParsing '%RAW%/f1_ollama_bridge.py' -OutFile '%ROOT%\f1_ollama_bridge.py'"
>>"%ROOT%\AGGIORNA_BRIDGE.cmd" echo call "%ROOT%\AVVIA_BRIDGE.cmd"

>"%ROOT%\CONFIGURA_BRIDGE.cmd" echo @echo off
>>"%ROOT%\CONFIGURA_BRIDGE.cmd" echo start "F1 Config" "%VENV%\Scripts\pythonw.exe" "%ROOT%\configura_bridge.pyw"

>"%ROOT%\CHATGPT_LOGIN.cmd" echo @echo off
>>"%ROOT%\CHATGPT_LOGIN.cmd" echo start "F1 ChatGPT Login" "%VENV%\Scripts\python.exe" "%ROOT%\f1_chatgpt_uploader.py" --login

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $desk=[Environment]::GetFolderPath('Desktop'); $s=$ws.CreateShortcut((Join-Path $desk 'F1 - Configura Sync e Ollama.lnk')); $s.TargetPath='%ROOT%\CONFIGURA_BRIDGE.cmd'; $s.WorkingDirectory='%ROOT%'; $s.Save(); $g=$ws.CreateShortcut((Join-Path $desk 'F1 - ChatGPT Login.lnk')); $g.TargetPath='%ROOT%\CHATGPT_LOGIN.cmd'; $g.WorkingDirectory='%ROOT%'; $g.Save(); $u=$ws.CreateShortcut((Join-Path $desk 'F1 - Aggiorna Bridge.lnk')); $u.TargetPath='%ROOT%\AGGIORNA_BRIDGE.cmd'; $u.WorkingDirectory='%ROOT%'; $u.Save(); $startup=[Environment]::GetFolderPath('Startup'); $a=$ws.CreateShortcut((Join-Path $startup 'F1 Bridge Contatti.lnk')); $a.TargetPath='%ROOT%\AVVIA_BRIDGE.cmd'; $a.WorkingDirectory='%ROOT%'; $a.Save()"

if not exist "%USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI" mkdir "%USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI"

start "F1 Config" "%VENV%\Scripts\pythonw.exe" "%ROOT%\configura_bridge.pyw"
start "F1 Bridge" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_ollama_bridge.py" --watch
start "F1 ChatGPT Uploader" /min "%VENV%\Scripts\pythonw.exe" "%ROOT%\f1_chatgpt_uploader.py" --serve

echo.
echo INSTALLAZIONE COMPLETATA.
echo - Icona Desktop: F1 - Configura Sync e Ollama
 echo - Bridge avviato automaticamente a ogni accesso Windows
 echo - Uploader ChatGPT locale attivo su 127.0.0.1:8765
 echo - Icona Desktop: F1 - ChatGPT Login ^(accesso ChatGPT una sola volta^)
 echo - Icona Desktop: F1 - Aggiorna Bridge
 echo - Uploader ChatGPT si auto-aggiorna da GitHub all'avvio
 echo - Importa CSV/XLSX in: %USERPROFILE%\Documents\F1_Bridge\IMPORTA_CONTATTI
 echo - Log: %USERPROFILE%\Documents\F1_Bridge\bridge.log
 echo.
pause
endlocal
