@echo off
echo ========================================================
echo   SPORTIO HUB - LOCAL DEVELOPMENT SERVER
echo ========================================================
echo.
echo Starting client (http://localhost:5173) and server (http://localhost:5000)...
cd /d "%~dp0"
call npm run dev
pause
