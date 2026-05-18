@echo off
setlocal EnableDelayedExpansion

set "PORT=5173"
set "FOUND="

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "FOUND=1"
  echo Stopping WebUI PID %%P on port %PORT%...
  taskkill /PID %%P /T /F >nul 2>nul
)

if not defined FOUND (
  echo WebUI is not running on port %PORT%.
) else (
  echo WebUI stopped.
)

endlocal
