@echo off
setlocal EnableExtensions
cd /d %~dp0
if not exist models\tts mkdir models\tts
call :download "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx" "models\tts\it_IT-paola-medium.onnx"
if errorlevel 1 exit /b 1
call :download "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx.json" "models\tts\it_IT-paola-medium.onnx.json"
if errorlevel 1 exit /b 1
echo [OK] Modello TTS italiano Paola scaricato.
exit /b 0
:download
set "URL=%~1"
set "OUT=%~2"
if exist "%OUT%" (for %%F in ("%OUT%") do if %%~zF GTR 1024 exit /b 0)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%OUT%'; if ((Get-Item '%OUT%').Length -lt 1024) { exit 2 }"
exit /b %errorlevel%
