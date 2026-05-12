@echo off
REM Dechta Support Chat Test Suite - Manual Execution Script
REM Run this script to set up and test the real-time support chat

echo ========================================
echo DECHTA SUPPORT CHAT TEST SUITE
echo ========================================
echo.

REM Check if .env exists
echo [1/7] Checking backend configuration...
if exist "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env" (
    echo ✓ .env file exists
) else (
    echo ✗ .env file missing! Creating template...
    echo DATABASE_URL=postgresql://postgres:password@localhost:5432/dechta > "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env"
    echo SESSION_SECRET=your_super_secret_session_key_change_this >> "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env"
    echo PORT=5000 >> "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend\.env"
    echo.
    echo ⚠ IMPORTANT: Edit backend\.env with your actual PostgreSQL credentials!
    echo.
    pause
)

echo.
echo [2/7] Checking if servers are running...
netstat -ano | findstr ":5000" | findstr "LISTENING" > nul
if %errorlevel%==0 (
    echo ✓ Backend server running on port 5000
) else (
    echo ✗ Backend server NOT running
    echo   Start with: cd backend ^&^& npm run dev
)

netstat -ano | findstr ":5174" | findstr "LISTENING" > nul
if %errorlevel%==0 (
    echo ✓ Ops portal running on port 5174
) else (
    echo ✗ Ops portal NOT running
    echo   Start with: cd ops ^&^& npm run dev
)

echo.
echo [3/7] Creating test HTML file for WebSocket testing...
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<title^>Dechta Chat Test Client - Vendor Simulator^</title^>
echo     ^<style^>
echo         body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
echo         h1 { color: #2563eb; }
echo         .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
echo         .connected { background: #d1fae5; color: #065f46; }
echo         .disconnected { background: #fee2e2; color: #991b1b; }
echo         #messages { height: 400px; overflow-y: scroll; border: 2px solid #e5e7eb; padding: 15px; margin: 20px 0; background: #f9fafb; border-radius: 8px; }
echo         .message { padding: 8px 12px; margin: 5px 0; border-radius: 6px; }
echo         .sent { background: #dbeafe; text-align: right; }
echo         .received { background: #fef3c7; }
echo         .system { background: #f3f4f6; font-style: italic; color: #6b7280; }
echo         input { width: 70%%; padding: 10px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 4px; }
echo         button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; }
echo         button:hover { background: #1d4ed8; }
echo         button:disabled { background: #9ca3af; cursor: not-allowed; }
echo         .test-info { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
echo         .controls { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<h1^>🧪 Dechta Chat Test Client^</h1^>
echo     ^<p^>This simulates a ^<strong^>Vendor^</strong^> connecting to the admin support chat.^</p^>
echo.    
echo     ^<div class="test-info"^>
echo         ^<strong^>TEST SCENARIO:^</strong^> Vendor (user ID: 1) sends messages to Admin. 
echo         Open admin panel at ^<a href="http://localhost:5174" target="_blank"^>http://localhost:5174^</a^> to see messages appear in real-time.
echo     ^</div^>
echo.    
echo     ^<div class="controls"^>
echo         ^<label^>^<strong^>Entity Type:^</strong^>^</label^>
echo         ^<select id="entityType"^>
echo             ^<option value="user"^>User (Vendor/Buyer)^</option^>
echo             ^<option value="client"^>Client^</option^>
echo             ^<option value="driver"^>Driver^</option^>
echo             ^<option value="worker"^>Worker^</option^>
echo         ^</select^>
echo         ^<label style="margin-left: 20px;"^>^<strong^>Entity ID:^</strong^>^</label^>
echo         ^<input type="text" id="entityId" value="1" style="width: 100px;"^>
echo         ^<button onclick="reconnect()"^>Reconnect^</button^>
echo     ^</div^>
echo.    
echo     ^<div id="status" class="status disconnected"^>⚫ Disconnected^</div^>
echo.    
echo     ^<div id="messages"^>^</div^>
echo.    
echo     ^<div^>
echo         ^<input id="convIdInput" type="number" placeholder="Conversation ID" value="1" style="width: 150px;"^>
echo         ^<button onclick="joinConversation()"^>Join Conversation^</button^>
echo     ^</div^>
echo     ^<br^>
echo     ^<div^>
echo         ^<input id="input" type="text" placeholder="Type your message here..." onkeypress="if(event.key==='Enter') sendMsg()"^>
echo         ^<button onclick="sendMsg()" id="sendBtn" disabled^>Send Message^</button^>
echo     ^</div^>
echo.    
echo     ^<script^>
echo         let ws = null;
echo         let currentConvId = null;
echo         const msgs = document.getElementById('messages'^);
echo         const statusDiv = document.getElementById('status'^);
echo         const sendBtn = document.getElementById('sendBtn'^);
echo.        
echo         function addMessage(content, type = 'system'^) {
echo             const msg = document.createElement('div'^);
echo             msg.className = 'message ' + type;
echo             msg.innerHTML = `^<small^>${new Date(^).toLocaleTimeString(^)}^</small^> ${content}`;
echo             msgs.appendChild(msg^);
echo             msgs.scrollTop = msgs.scrollHeight;
echo         }
echo.        
echo         function updateStatus(connected^) {
echo             if (connected^) {
echo                 statusDiv.className = 'status connected';
echo                 statusDiv.innerHTML = '🟢 Connected';
echo                 sendBtn.disabled = false;
echo             } else {
echo                 statusDiv.className = 'status disconnected';
echo                 statusDiv.innerHTML = '⚫ Disconnected';
echo                 sendBtn.disabled = true;
echo             }
echo         }
echo.        
echo         function connect(^) {
echo             const entityType = document.getElementById('entityType'^).value;
echo             const entityId = document.getElementById('entityId'^).value;
echo             const wsUrl = `ws://localhost:5000/ws/chat?entityType=${entityType}^&entityId=${entityId}`;
echo.            
echo             addMessage(`Connecting to: ${wsUrl}`, 'system'^);
echo.            
echo             ws = new WebSocket(wsUrl^);
echo.            
echo             ws.onopen = (^) =^> {
echo                 addMessage('✅ ^<strong^>WebSocket Connected!^</strong^>', 'system'^);
echo                 updateStatus(true^);
echo             };
echo.            
echo             ws.onmessage = (evt^) =^> {
echo                 try {
echo                     const data = JSON.parse(evt.data^);
echo                     addMessage(`^<strong^>${data.type}:^</strong^> ${JSON.stringify(data.data^)}`, 'received'^);
echo.                    
echo                     if (data.type === 'new_message' ^&^& data.data.senderType !== 'user'^) {
echo                         addMessage(`📩 Admin says: "${data.data.content}"`, 'received'^);
echo                     }
echo                 } catch (e^) {
echo                     addMessage('Error parsing message: ' + evt.data, 'system'^);
echo                 }
echo             };
echo.            
echo             ws.onclose = (^) =^> {
echo                 addMessage('❌ WebSocket Disconnected', 'system'^);
echo                 updateStatus(false^);
echo             };
echo.            
echo             ws.onerror = (err^) =^> {
echo                 addMessage('⚠️ WebSocket Error', 'system'^);
echo                 console.error(err^);
echo             };
echo         }
echo.        
echo         function reconnect(^) {
echo             if (ws^) ws.close(^);
echo             msgs.innerHTML = '';
echo             connect(^);
echo         }
echo.        
echo         function joinConversation(^) {
echo             const convId = parseInt(document.getElementById('convIdInput'^).value^);
echo             if (!ws ^|^| ws.readyState !== WebSocket.OPEN^) {
echo                 alert('WebSocket not connected!'^);
echo                 return;
echo             }
echo             currentConvId = convId;
echo             ws.send(JSON.stringify({ type: 'join_conversation', data: { conversationId: convId } }^)^);
echo             addMessage(`📌 Joining conversation ID: ${convId}`, 'sent'^);
echo         }
echo.        
echo         function sendMsg(^) {
echo             const input = document.getElementById('input'^);
echo             const content = input.value.trim(^);
echo.            
echo             if (!content^) return;
echo             if (!currentConvId^) {
echo                 alert('Please join a conversation first!'^);
echo                 return;
echo             }
echo             if (!ws ^|^| ws.readyState !== WebSocket.OPEN^) {
echo                 alert('WebSocket not connected!'^);
echo                 return;
echo             }
echo.            
echo             ws.send(JSON.stringify({
echo                 type: 'send_message',
echo                 data: { conversationId: currentConvId, content, messageType: 'text' }
echo             }^)^);
echo.            
echo             addMessage(`💬 You: "${content}"`, 'sent'^);
echo             input.value = '';
echo         }
echo.        
echo         // Auto-connect on load
echo         window.onload = connect;
echo     ^</script^>
echo ^</body^>
echo ^</html^>
) > "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\test-chat-client.html"

echo ✓ Test client created: test-chat-client.html

echo.
echo [4/7] Creating browser console test script...
(
echo // ========================================
echo // DECHTA SUPPORT CHAT - BROWSER CONSOLE TEST
echo // ========================================
echo // Copy and paste this into browser console to simulate vendor
echo.
echo const ws = new WebSocket('ws://localhost:5000/ws/chat?entityType=user^&entityId=1'^);
echo.
echo ws.onopen = (^) =^> {
echo     console.log('✅ Vendor WebSocket Connected!'^);
echo     // Join conversation 1
echo     ws.send(JSON.stringify({ type: 'join_conversation', data: { conversationId: 1 } }^)^);
echo };
echo.
echo ws.onmessage = (evt^) =^> {
echo     const data = JSON.parse(evt.data^);
echo     console.log('📩 Received:', data^);
echo };
echo.
echo ws.onclose = (^) =^> console.log('❌ Disconnected'^);
echo ws.onerror = (err^) =^> console.error('⚠️ Error:', err^);
echo.
echo // Function to send message
echo function sendVendorMessage(text^) {
echo     ws.send(JSON.stringify({
echo         type: 'send_message',
echo         data: { conversationId: 1, content: text, messageType: 'text' }
echo     }^)^);
echo     console.log('💬 Sent:', text^);
echo }
echo.
echo // TEST: Send a message
echo setTimeout((^) =^> {
echo     sendVendorMessage('Hello Admin! This is a test message from vendor.'^);
echo }, 2000^);
echo.
echo console.log('✓ WebSocket test script loaded. Use sendVendorMessage("your text"^) to send messages.'^);
) > "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\console-test-script.js"

echo ✓ Console test script created: console-test-script.js

echo.
echo [5/7] Creating SQL test queries...
(
echo -- ========================================
echo -- DECHTA SUPPORT CHAT - DATABASE TEST QUERIES
echo -- ========================================
echo.
echo -- Check if test data exists
echo SELECT 
echo     'Users' as table_name, 
echo     COUNT(*^) as count 
echo FROM users 
echo WHERE role IN ('vendor', 'admin'^)
echo UNION ALL
echo SELECT 'Support Tickets', COUNT(*^) FROM support_tickets
echo UNION ALL
echo SELECT 'Conversations', COUNT(*^) FROM conversations
echo UNION ALL
echo SELECT 'Messages', COUNT(*^) FROM messages;
echo.
echo -- View all support conversations
echo SELECT 
echo     c.id as conv_id,
echo     c.participant1Type, c.participant1Id,
echo     c.participant2Type, c.participant2Id,
echo     c.conversationType,
echo     st.subject, st.status, st.priority,
echo     COUNT(m.id^) as message_count
echo FROM conversations c
echo LEFT JOIN support_tickets st ON c.supportTicketId = st.id
echo LEFT JOIN messages m ON m.conversationId = c.id
echo WHERE c.conversationType = 'support'
echo GROUP BY c.id, st.subject, st.status, st.priority;
echo.
echo -- View recent messages
echo SELECT 
echo     m.id,
echo     m.conversationId,
echo     m.senderType,
echo     m.senderId,
echo     m.content,
echo     m.createdAt
echo FROM messages m
echo ORDER BY m.createdAt DESC
echo LIMIT 10;
echo.
echo -- Create test conversation if none exists
echo INSERT INTO conversations (
echo     participant1Type, participant1Id,
echo     participant2Type, participant2Id,
echo     title, conversationType, status
echo ^) VALUES (
echo     'user', '0',
echo     'user', '1',
echo     'Test Support Chat',
echo     'support',
echo     'active'
echo ^)
echo ON CONFLICT DO NOTHING;
) > "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\test-queries.sql"

echo ✓ SQL test queries created: test-queries.sql

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo [6/7] NEXT STEPS - Run Tests:
echo.
echo 1. START SERVERS (if not running^):
echo    - Backend:  cd backend ^&^& npm run dev
echo    - Ops:      cd ops ^&^& npm run dev
echo.
echo 2. TEST METHOD A - HTML Test Client:
echo    - Open: test-chat-client.html in browser
echo    - Open: http://localhost:5174 (admin panel^) in another tab
echo    - Join conversation 1 in test client
echo    - Send messages and watch them appear in admin panel
echo.
echo 3. TEST METHOD B - Browser Console:
echo    - Open http://localhost:5174 (admin panel^)
echo    - Open browser DevTools Console (F12^)
echo    - Copy/paste contents of console-test-script.js
echo    - Use: sendVendorMessage("your message"^) to send messages
echo.
echo 4. VERIFY DATABASE:
echo    - Run queries from test-queries.sql in PostgreSQL
echo.
echo ========================================
echo.
echo [7/7] Opening test client in browser...
timeout /t 2 /nobreak >nul
start "" "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\test-chat-client.html"

echo.
echo ✅ Test suite ready! Check your browser.
echo.
pause
