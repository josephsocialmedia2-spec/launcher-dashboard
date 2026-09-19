@echo off
cd /d %~dp0
if not exist .venv\Scripts\python.exe call INSTALL_ALL.bat
call .venv\Scripts\activate.bat
pip install -U -r requirements.txt
if exist external\SadTalker\.git git -C external\SadTalker pull --ff-only
call TEST_ALL.bat
pause
