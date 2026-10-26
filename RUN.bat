@echo off
setlocal
cd /d "%~dp0"
title CyberGuard - Local Scanner
echo.
echo ============================================
echo  CyberGuard - URL and QR Security Scanner
echo ============================================
echo.
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  set "BASE_PY=py -3"
) else (
  set "BASE_PY=python"
)
if not exist ".venv\Scripts\python.exe" (
  echo [1/3] Creating Python environment...
  %BASE_PY% -m venv .venv
  if errorlevel 1 goto failure
) else (
  echo [1/3] Reusing Python environment.
)
echo [2/3] Installing required packages (internet required on first run)...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto failure
echo [3/3] Starting CyberGuard...
echo.
echo  Open this address in your browser:
echo  http://127.0.0.1:5000
echo.
echo  Keep this window open; press Ctrl+C to stop.
echo.
".venv\Scripts\python.exe" app.py
if errorlevel 1 goto failure
exit /b 0
:failure
echo.
echo ERROR: Could not start CyberGuard.
echo Make sure Python 3.11 or newer is installed and internet is available.
pause
exit /b 1
