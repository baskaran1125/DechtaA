@echo off
cd /d "C:\Users\LOKI\OneDrive\Desktop\Dechta-main\Dechta-main\DechtaService-main\backend"

echo ====================================================
echo RESTARTING BACKEND WITH FIX
echo ====================================================

REM Find and kill node processes on port 5000
echo Stopping old backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
    echo Killing process ID %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak

echo.
echo Starting backend with npm start...
echo ====================================================
npm start

pause
