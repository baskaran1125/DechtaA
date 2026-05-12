@echo off
echo.
echo ======================================================================
echo   RESTARTING BACKEND WITH BILLING FIX
echo ======================================================================
echo.

REM Kill all Node processes
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul

REM Wait 2 seconds
timeout /t 2 /nobreak

REM Start backend
echo.
echo Starting backend...
echo.
cd /d "C:\Users\LOKI\OneDrive\Desktop\Dechta-main\Dechta-main\DechtaService-main\backend"
npm start

pause
