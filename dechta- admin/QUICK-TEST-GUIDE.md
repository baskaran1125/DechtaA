# 🧪 DECHTA SUPPORT CHAT - QUICK TEST GUIDE

## ⚡ Quick Start (5 Minutes)

### 1. Start Servers
```bash
# Terminal 1
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\backend
npm run dev

# Terminal 2
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\ops
npm run dev
```

### 2. Run Automated Setup
```bash
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta
run-chat-tests.bat
```

This opens the HTML test client automatically.

### 3. Login to Admin Panel
- Open: http://localhost:5174
- Login: `admin@example.com` / `password123`
- Navigate to: **Support** page

### 4. Test Real-Time Chat

**Method A: HTML Test Client** (Recommended)
1. HTML client should be open (opened by run-chat-tests.bat)
2. Verify status: "🟢 Connected"
3. Enter Conversation ID: `1`
4. Click "Join Conversation"
5. Type: "Hello Admin, testing real-time chat"
6. Click "Send Message"
7. 👀 **Watch admin panel** - message should appear instantly!

**Method B: Browser Console**
1. Open admin panel in browser
2. Press F12 (DevTools)
3. Go to Console tab
4. Copy entire contents of `console-test-script.js`
5. Paste into console and press Enter
6. Use: `sendVendorMessage("your message")`
7. 👀 **Watch admin panel** - message appears!

---

## 📋 Test Checklist

### ✅ WebSocket Tests
- [ ] TC-WS-001: Admin connects successfully
  - DevTools → Network → WS tab shows connection
  - Status: 101 Switching Protocols
  
- [ ] TC-WS-002: Auto-reconnect works
  - Stop backend (Ctrl+C), restart
  - Connection re-establishes within 5 seconds

### ✅ Real-Time Chat Tests
- [ ] TC-CHAT-001: Vendor → Admin messaging
  - Send from HTML client
  - Appears in admin panel instantly (< 500ms)
  
- [ ] TC-CHAT-002: Admin → Vendor messaging
  - Send from admin panel
  - Appears in HTML client instantly

- [ ] TC-CHAT-003: Typing indicators
  - Start typing in admin panel
  - HTML client shows typing indicator (if UI implemented)

### ✅ UI Tests
- [ ] TC-UI-001: Conversation list loads
  - Shows participant names
  - Shows last message preview
  - Shows timestamp
  
- [ ] TC-UI-002: Empty state displays
  - "Select a conversation" message
  
- [ ] TC-UI-003: Message history loads
  - All previous messages appear
  - Scrolled to bottom

### ✅ API Tests
- [ ] TC-API-001: REST fallback works
  - DevTools → Network → Offline mode
  - Send message (uses REST POST)
  
- [ ] TC-API-002: GET /api/ops/support/conversations
  - Network tab shows XHR request
  - Returns array of conversations

---

## 🔍 Verification Points

### Backend Console Should Show:
```
[WS Chat] Client attempting to connect
[WS Chat] user:1 connected (conversations: 1)
[WS Chat] Broadcasting to conversation 1
```

### Browser Console Should Show:
```
✅ Vendor WebSocket Connected!
📩 Received: {type: "connected", data: {...}}
💬 Sent: Hello Admin...
📩 Received: {type: "message_sent", data: {...}}
```

### Admin Panel Should Show:
- Conversation in left sidebar
- Message appears in chat window (right side)
- Timestamp matches current time
- No errors in console

---

## 🐛 Troubleshooting

### WebSocket Won't Connect
**Check**:
1. Backend running? → `curl http://localhost:5000/api/auth/me`
2. Port 5000 in use? → `netstat -ano | findstr :5000`
3. Firewall blocking? → Temporarily disable

**Fix**: Restart backend, refresh browser

---

### Messages Not Appearing
**Check**:
1. WebSocket status in HTML client: Should be "🟢 Connected"
2. Conversation ID matches in both client and admin panel
3. Backend console for errors
4. Browser console for errors

**Fix**: 
- Verify conversation exists: `SELECT * FROM conversations WHERE id = 1;`
- Re-join conversation: Click "Join Conversation" again

---

### "Conversation Not Found"
**Fix**: Create test conversation:
```sql
INSERT INTO conversations (
    participant1Type, participant1Id,
    participant2Type, participant2Id,
    title, conversationType, status
) VALUES (
    'user', '0',
    'user', '1',
    'Test Support Chat',
    'support',
    'active'
) RETURNING id;
```

---

## 📸 Screenshots to Capture

1. `admin-websocket-connected.png` - DevTools WS tab showing connection
2. `vendor-sends-message.png` - HTML client after sending
3. `admin-receives-message.png` - Admin panel showing message
4. `admin-sends-reply.png` - Admin typing and sending
5. `vendor-receives-reply.png` - HTML client showing admin's reply

---

## 📊 Expected Results Summary

| Test | Expected Latency | Pass Criteria |
|------|-----------------|---------------|
| WebSocket Connect | < 1 second | Status: Connected |
| Message Send | < 500ms | Message appears without refresh |
| Auto-Reconnect | < 5 seconds | Connection re-established |
| Typing Indicator | < 100ms | Indicator appears |
| REST Fallback | < 2 seconds | Message saved via POST |

---

## ✅ Success Criteria

**PASS** if:
- ✅ WebSocket connects successfully for admin
- ✅ Messages sent from HTML client appear in admin panel instantly
- ✅ Messages sent from admin appear in HTML client instantly
- ✅ No console errors
- ✅ Database persists all messages

**PARTIAL PASS** if:
- ⚠️ Real-time works but with > 1 second delay
- ⚠️ REST fallback works but WebSocket unreliable

**FAIL** if:
- ❌ WebSocket won't connect
- ❌ Messages don't appear in real-time (require refresh)
- ❌ Messages not saved to database

---

## 🎯 Next Steps After Testing

### If Tests Pass ✅
1. Document test results in `test-execution-log.md`
2. Take screenshots for evidence
3. Proceed to vendor integration (Phase 1)

### If Tests Fail ❌
1. Document exact error messages
2. Check backend logs
3. Verify database connectivity
4. Review WebSocket implementation in `backend/routes.ts`

---

## 📁 Test Files Location

All in: `c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta\`

- `run-chat-tests.bat` - Automated setup
- `test-chat-client.html` - Interactive test client
- `console-test-script.js` - Browser console script
- `test-queries.sql` - Database queries
- `test-execution-log.md` - Detailed test log

---

## 🚀 Pro Tips

1. **Use Two Monitors**: Admin panel on one, test client on another
2. **Keep DevTools Open**: Network tab for API calls, Console for logs
3. **Test Fast**: Send multiple messages quickly to test race conditions
4. **Check Database**: After each test, verify `SELECT * FROM messages ORDER BY id DESC LIMIT 5;`
5. **Take Notes**: Document any unexpected behavior

---

## 📞 Support

- Test documentation: `support-chat-test-plan.md`
- Detailed logs: `test-execution-log.md`
- SKILL file: `SKILL.md` (developer reference)

---

**Ready to test! 🎉**

Run `run-chat-tests.bat` to begin.
