@echo off
cd /d "c:\Users\LOKI\OneDrive\Desktop\Dechta-main\Dechta-main\DechtaService-main\backend"
echo Running database diagnostics...
call node db-diagnostics.js
echo.
echo Generating comprehensive report...
call node generate-report.js
echo.
echo Done! Check DATABASE_REPORT.txt for full details.
pause
