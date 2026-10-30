@echo off
echo ========================================================
echo   SPORTIO HUB - VERCEL PRODUCTION DEPLOYMENT
echo ========================================================
echo.

echo [1/2] Deploying Client to Vercel...
cd /d "%~dp0client"
call npx vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo [!] Frontend deployment failed or requires Vercel login.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Deploying Server to Vercel...
cd /d "%~dp0server"
call npx vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo [!] Server deployment failed or requires Vercel login.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   Sportio Hub successfully deployed to production!
echo ========================================================
pause
