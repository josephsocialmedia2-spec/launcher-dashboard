@echo off
setlocal
chcp 65001 >nul
title F1 - Installa Motore Microzone

set "BASE=%USERPROFILE%\Documents\F1_Directory_Microzone"
set "SCRIPT=%BASE%\f1_microzone_directory.py"
set "RUN=%BASE%\AVVIA_MOTORE.cmd"
set "URL=https://raw.githubusercontent.com/josephsocialmedia2-spec/launcher-dashboard/main/windows-bridge/f1_microzone_directory.py"

mkdir "%BASE%" 2>nul
mkdir "%BASE%\data" 2>nul
mkdir "%BASE%\IMPORTA_ESISTENTI" 2>nul

rem Se il pacchetto contiene gia il database storico, copialo nella cartella privata locale.
if exist "%~dp0IMPORTA_ESISTENTI\*" (
  echo Copio archivio contatti esistente...
  xcopy /Y /I "%~dp0IMPORTA_ESISTENTI\*" "%BASE%\IMPORTA_ESISTENTI\" >nul
)

echo [1/5] Controllo Python...
where py >nul 2>nul
if errorlevel 1 (
  echo Python non trovato. Provo installazione con winget...
  where winget >nul 2>nul
  if errorlevel 1 goto :nopython
  winget install -e --id Python.Python.3.13 --accept-package-agreements --accept-source-agreements
)

echo [2/5] Installo dipendenze...
py -m pip install --disable-pip-version-check --upgrade selenium openpyxl
if errorlevel 1 goto :error

echo [3/5] Scarico il motore aggiornato...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%URL%' -OutFile '%SCRIPT%'"
if errorlevel 1 goto :error

>"%RUN%" echo @echo off
>>"%RUN%" echo chcp 65001 ^>nul
>>"%RUN%" echo cd /d "%BASE%"
>>"%RUN%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%URL%' -OutFile '%SCRIPT%'" ^>nul 2^>nul
>>"%RUN%" echo py "%SCRIPT%"

echo [4/5] Creo collegamenti Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell;$d=[Environment]::GetFolderPath('Desktop');$s=$ws.CreateShortcut((Join-Path $d 'F1 - Lista Mattino.lnk'));$s.TargetPath='%RUN%';$s.WorkingDirectory='%BASE%';$s.IconLocation='shell32.dll,167';$s.Save()"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell;$d=[Environment]::GetFolderPath('Desktop');$s=$ws.CreateShortcut((Join-Path $d 'F1 - Apri Lista Telefonate.lnk'));$s.TargetPath='%BASE%\LISTA_MATTINO.html';$s.WorkingDirectory='%BASE%';$s.IconLocation='shell32.dll,220';$s.Save()"

echo [5/5] Programmo esecuzione giornaliera alle 04:30...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$a=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c ""%RUN%""';$t=New-ScheduledTaskTrigger -Daily -At 4:30AM;$s=New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries;Register-ScheduledTask -TaskName 'F1 Motore Microzone' -Action $a -Trigger $t -Settings $s -Description 'Aggiorna vie e numeri pubblici per le microzone F1 e genera LISTA_MATTINO.html' -Force | Out-Null"
if errorlevel 1 (
  echo ATTENZIONE: pianificazione automatica non riuscita. Il collegamento Desktop funziona comunque.
)

echo.
echo INSTALLAZIONE COMPLETATA.
echo Cartella: %BASE%
echo Avvio automatico previsto: 04:30, con recupero se il PC era spento.
echo Ora eseguo un primo aggiornamento.
echo.
call "%RUN%"
exit /b 0

:nopython
echo ERRORE: Python non installato e winget non disponibile.
pause
exit /b 2

:error
echo ERRORE durante l'installazione. Leggi il messaggio sopra.
pause
exit /b 1
