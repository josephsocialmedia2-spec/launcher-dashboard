@echo off
setlocal EnableExtensions
cd /d %~dp0

echo ==============================================
echo  UGC AVATAR STUDIO - INSTALLAZIONE SADTALKER
echo ==============================================

where winget >nul 2>nul || (
  echo [ERRORE] winget non disponibile.
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

py -3.8 -c "import sys; print(sys.version)" >nul 2>nul
if errorlevel 1 (
  echo [INFO] Installazione Python 3.8 tramite winget...
  winget install -e --id Python.Python.3.8 --scope user --accept-package-agreements --accept-source-agreements
  call :refresh_path
)

py -3.8 -c "import sys; print(sys.version)" >nul 2>nul
if errorlevel 1 (
  echo [INFO] Fallback installer ufficiale Python 3.8.10...
  set "PY38_INSTALLER=%TEMP%\python-3.8.10-amd64.exe"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.8.10/python-3.8.10-amd64.exe' -OutFile '%PY38_INSTALLER%'"
  if errorlevel 1 exit /b 1
  "%PY38_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_launcher=1
  if errorlevel 1 exit /b 1
  call :refresh_path
)

py -3.8 -c "import sys; print(sys.version)" >nul 2>nul || (
  echo [ERRORE] Python 3.8 non disponibile dopo i tentativi automatici.
  exit /b 1
)

if not exist external mkdir external
if not exist external\SadTalker (
  git clone --depth 1 https://github.com/OpenTalker/SadTalker.git external\SadTalker
  if errorlevel 1 exit /b 1
)

if not exist external\SadTalker\.venv\Scripts\python.exe (
  py -3.8 -m venv external\SadTalker\.venv
  if errorlevel 1 exit /b 1
)

call external\SadTalker\.venv\Scripts\activate.bat
python -m pip install --upgrade "pip<25" setuptools wheel
if errorlevel 1 exit /b 1

echo [INFO] Installazione PyTorch compatibile con SadTalker...
pip install torch==1.12.1+cu113 torchvision==0.13.1+cu113 torchaudio==0.12.1 --extra-index-url https://download.pytorch.org/whl/cu113
if errorlevel 1 (
  echo [ERRORE] Installazione PyTorch SadTalker fallita.
  exit /b 1
)

pip install -r external\SadTalker\requirements.txt
if errorlevel 1 (
  echo [ERRORE] Dipendenze SadTalker non installate.
  exit /b 1
)

call :download "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar" "external\SadTalker\checkpoints\mapping_00109-model.pth.tar"
if errorlevel 1 exit /b 1
call :download "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar" "external\SadTalker\checkpoints\mapping_00229-model.pth.tar"
if errorlevel 1 exit /b 1
call :download "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors" "external\SadTalker\checkpoints\SadTalker_V0.0.2_256.safetensors"
if errorlevel 1 exit /b 1
call :download "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors" "external\SadTalker\checkpoints\SadTalker_V0.0.2_512.safetensors"
if errorlevel 1 exit /b 1
call :download "https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth" "external\SadTalker\gfpgan\weights\alignment_WFLW_4HG.pth"
if errorlevel 1 exit /b 1
call :download "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth" "external\SadTalker\gfpgan\weights\detection_Resnet50_Final.pth"
if errorlevel 1 exit /b 1
call :download "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth" "external\SadTalker\gfpgan\weights\GFPGANv1.4.pth"
if errorlevel 1 exit /b 1
call :download "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth" "external\SadTalker\gfpgan\weights\parsing_parsenet.pth"
if errorlevel 1 exit /b 1

python -c "import torch, numpy, scipy, cv2; print('Torch',torch.__version__); print('CUDA',torch.cuda.is_available())"
if errorlevel 1 exit /b 1

if not exist external\SadTalker\inference.py (
  echo [ERRORE] inference.py SadTalker mancante.
  exit /b 1
)
if not exist external\SadTalker\examples\source_image\full_body_1.png (
  echo [ERRORE] Immagine self-test SadTalker mancante.
  exit /b 1
)
if not exist external\SadTalker\checkpoints\SadTalker_V0.0.2_512.safetensors (
  echo [ERRORE] Checkpoint 512 mancante.
  exit /b 1
)

echo [OK] SadTalker installato e dipendenze verificate.
exit /b 0

:download
set "URL=%~1"
set "OUT=%~2"
for %%D in ("%OUT%") do if not exist "%%~dpD" mkdir "%%~dpD"
if exist "%OUT%" (
  for %%F in ("%OUT%") do if %%~zF GTR 1024 (
    echo [SKIP] %%~nxF gia presente.
    exit /b 0
  )
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%OUT%'; if ((Get-Item '%OUT%').Length -lt 1024) { exit 2 }"
exit /b %errorlevel%

:refresh_path
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$m=[Environment]::GetEnvironmentVariable('Path','Machine'); $u=[Environment]::GetEnvironmentVariable('Path','User'); Write-Output ($m+';'+$u)"`) do set "PATH=%%P"
exit /b 0
