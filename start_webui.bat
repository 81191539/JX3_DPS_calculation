@echo off
setlocal

set "PORT=5173"
set "HOST=127.0.0.1"
set "URL=http://%HOST%:%PORT%/app.html"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "WEBUI_PID=%%P"
)

if defined WEBUI_PID (
  echo WebUI already running: %URL% - PID %WEBUI_PID%.
  start "" "%URL%"
  exit /b 0
)

echo Starting WebUI: %URL%
start "JX3 DPS WebUI" /min cmd /c "npm run dev -- --host %HOST% --port %PORT%"
timeout /t 3 /nobreak >nul
start "" "%URL%"

endlocal
