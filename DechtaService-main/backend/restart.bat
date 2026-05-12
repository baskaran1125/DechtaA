#!/bin/bash
cd "C:\Users\LOKI\OneDrive\Desktop\Dechta-main\Dechta-main\DechtaService-main\backend"

# Kill existing node processes on port 5000
netstat -ano | findstr ":5000" | for /f "tokens=5" %%a in ('findstr .:5000') do taskkill /PID %%a /F

# Wait a bit
timeout /t 2 /nobreak

# Start backend
npm start
