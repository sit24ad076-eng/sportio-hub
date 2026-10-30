@echo off
echo ========================================================
echo   PUSHING TO GITHUB FOR DIRECT VERCEL AUTO-DEPLOYMENT
echo ========================================================
echo.
cd /d "%~dp0"
echo [1/3] Staging changes...
git add .

echo [2/3] Committing changes...
git commit -m "feat: guided live capture, verification queue, and QR identity"

echo [3/3] Pushing to main branch on GitHub...
git push origin main

echo.
echo ========================================================
echo   Pushed to https://github.com/sit24ad076-eng/sportio-hub!
echo.
echo   Vercel is now automatically deploying directly at:
echo   https://client-eight-dun-35.vercel.app/
echo ========================================================
echo.
pause
