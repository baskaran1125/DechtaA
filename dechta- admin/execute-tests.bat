@echo off
REM ========================================
REM DECHTA SUPPORT CHAT - AUTOMATED TEST EXECUTION
REM ========================================

echo.
echo ╔════════════════════════════════════════╗
echo ║  DECHTA SUPPORT CHAT TEST EXECUTION   ║
echo ╚════════════════════════════════════════╝
echo.

REM Set colors (not available in basic cmd, but showing structure)
set PASS=[PASS]
set FAIL=[FAIL]
set INFO=[INFO]
set WARN=[WARN]

echo %INFO% Starting test execution...
echo %INFO% Timestamp: %date% %time%
echo.

REM ========================================
REM STEP 1: CHECK PREREQUISITES
REM ========================================
echo ========================================
echo STEP 1: Checking Prerequisites
echo ========================================
echo.

echo %INFO% Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %FAIL% Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
) else (
    echo %PASS% Node.js found
)

echo %INFO% Checking if PostgreSQL is accessible...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %WARN% PostgreSQL CLI not in PATH (optional, not critical)
) else (
    echo %PASS% PostgreSQL found
)

echo.

REM ========================================
REM STEP 2: CHECK BACKEND .ENV
REM ========================================
echo ========================================
echo STEP 2: Checking Backend Configuration
echo ========================================
echo.

if exist "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env" (
    echo %PASS% Backend .env file exists
) else (
    echo %WARN% Backend .env file missing!
    echo Creating template .env file...
    (
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/dechta
        echo SESSION_SECRET=your_super_secret_session_key_change_in_production
        echo PORT=5000
    ) > "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env"
    echo %PASS% Template .env created
    echo.
    echo ⚠️  IMPORTANT: Update backend\.env with your actual database credentials!
    echo.
    pause
)

echo.

REM ========================================
REM STEP 3: CHECK IF SERVERS ARE RUNNING
REM ========================================
echo ========================================
echo STEP 3: Checking Server Status
echo ========================================
echo.

echo %INFO% Checking port 5000 (Backend API)...
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo %PASS% Backend server is running on port 5000
    set BACKEND_RUNNING=1
) else (
    echo %WARN% Backend server NOT running on port 5000
    echo %INFO% You need to start it manually:
    echo        cd backend ^&^& npm run dev
    set BACKEND_RUNNING=0
)

echo.
echo %INFO% Checking port 5174 (Ops Portal)...
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo %PASS% Ops portal is running on port 5174
    set OPS_RUNNING=1
) else (
    echo %WARN% Ops portal NOT running on port 5174
    echo %INFO% You need to start it manually:
    echo        cd ops ^&^& npm run dev
    set OPS_RUNNING=0
)

echo.

if "%BACKEND_RUNNING%"=="0" (
    echo.
    echo ╔════════════════════════════════════════════════════════╗
    echo ║  ACTION REQUIRED: Start Backend Server                ║
    echo ╚════════════════════════════════════════════════════════╝
    echo.
    echo Open a NEW terminal and run:
    echo   cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend
    echo   npm run dev
    echo.
    echo Press any key once backend is running...
    pause >nul
)

if "%OPS_RUNNING%"=="0" (
    echo.
    echo ╔════════════════════════════════════════════════════════╗
    echo ║  ACTION REQUIRED: Start Ops Portal                    ║
    echo ╚════════════════════════════════════════════════════════╝
    echo.
    echo Open another NEW terminal and run:
    echo   cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\ops
    echo   npm run dev
    echo.
    echo Press any key once ops portal is running...
    pause >nul
)

echo.

REM ========================================
REM STEP 4: VERIFY SERVER HEALTH
REM ========================================
echo ========================================
echo STEP 4: Verifying Server Health
echo ========================================
echo.

echo %INFO% Testing backend API endpoint...
curl -s http://localhost:5000/api/auth/me >nul 2>&1
if %errorlevel% equ 0 (
    echo %PASS% Backend API responding
) else (
    echo %WARN% Backend API not responding (may need more startup time)
    echo %INFO% Waiting 5 more seconds...
    timeout /t 5 /nobreak >nul
)

echo.

REM ========================================
REM STEP 5: OPEN TEST CLIENT
REM ========================================
echo ========================================
echo STEP 5: Opening Test Client
echo ========================================
echo.

echo %INFO% Opening HTML test client in browser...
start "" "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\test-chat-client.html"
timeout /t 2 /nobreak >nul
echo %PASS% Test client opened

echo.
echo %INFO% Opening admin panel in browser...
start "" "http://localhost:5174"
timeout /t 2 /nobreak >nul
echo %PASS% Admin panel opened

echo.

REM ========================================
REM STEP 6: DISPLAY TEST INSTRUCTIONS
REM ========================================
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                READY TO EXECUTE TESTS                  ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Two browser tabs should now be open:
echo   1. test-chat-client.html (Vendor Simulator)
echo   2. http://localhost:5174 (Admin Panel)
echo.
echo ────────────────────────────────────────────────────────
echo TEST EXECUTION STEPS:
echo ────────────────────────────────────────────────────────
echo.
echo [TAB 1 - Test Client]
echo   1. Verify status shows: "🟢 Connected"
echo   2. Entity Type: User (Vendor)
echo   3. Entity ID: 1
echo   4. Conversation ID: 1
echo   5. Click "Join Conversation"
echo.
echo [TAB 2 - Admin Panel]
echo   6. Login: admin@example.com / password123
echo   7. Navigate to: Support page
echo.
echo [TAB 1 - Test Client]
echo   8. Type: "Hello Admin, I need help with product approval"
echo   9. Click "Send Message"
echo.
echo [TAB 2 - Admin Panel]
echo   10. ✨ VERIFY: Message appears instantly (without refresh)
echo.
echo [TAB 2 - Admin Panel]
echo   11. Type reply: "Hi! How can I assist you?"
echo   12. Press Enter
echo.
echo [TAB 1 - Test Client]
echo   13. ✨ VERIFY: Reply appears instantly
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 📋 TEST CHECKLIST (Mark each as you complete):
echo.
echo [ ] TC-WS-001: Admin WebSocket connected (check DevTools WS tab)
echo [ ] TC-CHAT-001: Vendor → Admin message appears in real-time
echo [ ] TC-CHAT-002: Admin → Vendor message appears in real-time
echo [ ] TC-UI-001: Conversation list displays correctly
echo [ ] TC-UI-003: Message history loads
echo [ ] TC-API-002: GET /api/ops/support/conversations works
echo [ ] TC-WS-002: Auto-reconnect (restart backend, verify reconnects)
echo [ ] TC-API-001: REST fallback (DevTools offline mode, send message)
echo [ ] TC-UI-002: Empty state displays
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 🐛 TROUBLESHOOTING:
echo.
echo Issue: WebSocket won't connect
echo Fix:   - Verify backend is running on port 5000
echo        - Check browser console for errors
echo        - Try: curl http://localhost:5000/api/auth/me
echo.
echo Issue: Messages not appearing
echo Fix:   - Check WebSocket status (should be "🟢 Connected")
echo        - Verify conversation ID = 1 in both client and admin
echo        - Check backend console for logs
echo.
echo Issue: "Conversation not found"
echo Fix:   - Run test-queries.sql to create test conversation
echo        - Or use psql: INSERT INTO conversations ...
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 📸 SCREENSHOTS TO CAPTURE:
echo.
echo 1. Admin panel - DevTools Network WS tab (connected)
echo 2. Test client - Message sent
echo 3. Admin panel - Message received
echo 4. Admin panel - Reply sent
echo 5. Test client - Reply received
echo.
echo Save screenshots to: c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\screenshots\
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 📝 AFTER TESTING:
echo.
echo 1. Document results in: test-execution-log.md
echo 2. Update test_cases table with results
echo 3. Note any bugs or issues found
echo.
echo ────────────────────────────────────────────────────────
echo.
echo Press any key to view additional test commands...
pause >nul

cls
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║            ADDITIONAL TEST COMMANDS                    ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo DATABASE QUERIES (Run in PostgreSQL):
echo ────────────────────────────────────────────────────────
echo.
echo # View all messages in conversation 1:
echo SELECT * FROM messages WHERE conversationId = 1 ORDER BY createdAt;
echo.
echo # Check conversation exists:
echo SELECT * FROM conversations WHERE id = 1;
echo.
echo # View recent messages:
echo SELECT id, senderType, senderId, content, createdAt 
echo FROM messages ORDER BY createdAt DESC LIMIT 10;
echo.
echo ────────────────────────────────────────────────────────
echo.
echo BROWSER CONSOLE ALTERNATIVE (Press F12 in admin panel):
echo ────────────────────────────────────────────────────────
echo.
echo // Connect as vendor
echo const ws = new WebSocket('ws://localhost:5000/ws/chat?entityType=user^&entityId=1');
echo ws.onopen = () =^> console.log('Connected!');
echo ws.onmessage = (e) =^> console.log('Received:', JSON.parse(e.data));
echo.
echo // Join conversation
echo ws.send(JSON.stringify({ type: 'join_conversation', data: { conversationId: 1 } }));
echo.
echo // Send message
echo ws.send(JSON.stringify({
echo   type: 'send_message',
echo   data: { conversationId: 1, content: 'Test from console', messageType: 'text' }
echo }));
echo.
echo ────────────────────────────────────────────────────────
echo.
echo API TESTING (Use curl or Postman):
echo ────────────────────────────────────────────────────────
echo.
echo # Get conversations
echo curl http://localhost:5000/api/ops/support/conversations
echo.
echo # Get messages for conversation 1
echo curl http://localhost:5000/api/chat/conversations/1/messages
echo.
echo ────────────────────────────────────────────────────────
echo.
echo 🎉 HAPPY TESTING!
echo.
echo For detailed test procedures, see:
echo - QUICK-TEST-GUIDE.md (quick reference)
echo - support-chat-test-plan.md (full documentation)
echo - test-execution-log.md (results template)
echo.
pause
