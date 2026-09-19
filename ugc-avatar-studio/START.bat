@echo off
setlocal
cd /d %~dp0
if not exist .venv\Scripts\python.exe (
  call INSTALL_ALL.bat
  if errorlevel 1 exit /b 1
)
call TEST_ALL.bat
if errorlevel 1 exit /b 1
start "UGC AVATAR STUDIO" http://127.0.0.1:8787
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8787
