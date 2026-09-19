@echo off
setlocal EnableExtensions
cd /d %~dp0

echo ==============================================
echo   UGC AVATAR STUDIO - END TO END SELF TEST
echo ==============================================

call TEST_ALL.bat
if errorlevel 1 (
  echo [ERRORE] Test preliminari falliti.
  exit /b 1
)

echo [TEST] Avvio inferenza SadTalker reale...
.venv\Scripts\python.exe scripts\verify_sadtalker.py
if errorlevel 1 (
  echo [ERRORE] Test end-to-end SadTalker fallito.
  exit /b 1
)

if not exist renders\_selftest\VIDEO_UGC_001.mp4 (
  echo [ERRORE] Output finale non trovato.
  exit /b 1
)

echo.
echo [OK] TEST END-TO-END SUPERATO
echo OUTPUT: %CD%\renders\_selftest\VIDEO_UGC_001.mp4
exit /b 0
