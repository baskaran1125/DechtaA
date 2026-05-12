@echo off
echo.
echo ======================================================================
echo   CHECKING BACKEND STATUS
echo ======================================================================
echo.

REM Check if backend is running on port 5000
netstat -ano | findstr ":5000" >nul
if %errorlevel% equ 0 (
    echo ✅ Backend is running on port 5000
    echo.
    echo Restarting backend to apply invoices fix...
    echo.
    taskkill /F /IM node.exe
    timeout /t 2
    npm start
) else (
    echo ⚠️  Backend is NOT running
    echo.
    echo Starting backend with npm start...
    echo.
    npm start
)
pause
