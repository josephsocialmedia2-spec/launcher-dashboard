@echo off
setlocal EnableExtensions
cd /d %~dp0
where winget >nul 2>nul || (echo [ERRORE] winget non disponibile.& exit /b 1)
where git >nul 2>nul || winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
where ffmpeg >nul 2>nul || winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
py -3.8 -c "import sys" >nul 2>nul
if errorlevel 1 winget install -e --id Python.Python.3.8 --accept-package-agreements --accept-source-agreements
py -3.8 -c "import sys" >nul 2>nul || (echo [ERRORE] Python 3.8 non disponibile dopo installazione. Riavvia Windows e rilancia.& exit /b 1)
if not exist external mkdir external
if not exist external\SadTalker git clone --depth 1 https://github.com/OpenTalker/SadTalker.git external\SadTalker
if errorlevel 1 exit /b 1
if not exist external\SadTalker\.venv\Scripts\python.exe py -3.8 -m venv external\SadTalker\.venv
if errorlevel 1 exit /b 1
call external\SadTalker\.venv\Scripts\activate.bat
python -m pip install --upgrade "pip<25" setuptools wheel
pip install torch torchvision torchaudio
if errorlevel 1 exit /b 1
pip install -r external\SadTalker\requirements.txt
if errorlevel 1 exit /b 1
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
if not exist external\SadTalker\inference.py exit /b 1
if not exist external\SadTalker\checkpoints\SadTalker_V0.0.2_512.safetensors exit /b 1
echo [OK] SadTalker installato e verificato.
exit /b 0
:download
set "URL=%~1"
set "OUT=%~2"
for %%D in ("%OUT%") do if not exist "%%~dpD" mkdir "%%~dpD"
if exist "%OUT%" (for %%F in ("%OUT%") do if %%~zF GTR 1024 exit /b 0)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%OUT%'; if ((Get-Item '%OUT%').Length -lt 1024) { exit 2 }"
exit /b %errorlevel%
