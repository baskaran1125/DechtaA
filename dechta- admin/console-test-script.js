// ========================================
// DECHTA SUPPORT CHAT - BROWSER CONSOLE TEST
// ========================================
// Copy and paste this entire script into browser console to simulate vendor

console.log('🧪 Dechta Support Chat Test - Vendor Simulator');
console.log('================================================');

const ws = new WebSocket('ws://localhost:5000/ws/chat?entityType=user&entityId=1');

ws.onopen = () => {
    console.log('✅ Vendor WebSocket Connected!');
    console.log('Joining conversation ID: 1...');
    // Join conversation 1
    ws.send(JSON.stringify({ 
        type: 'join_conversation', 
        data: { conversationId: 1 } 
    }));
};

ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    console.log('📩 Received:', data);
    
    // Highlight new messages
    if (data.type === 'new_message') {
        console.log('💬 NEW MESSAGE:', data.data.content);
        console.log('   From:', data.data.senderType + ':' + data.data.senderId);
    }
    
    // Show typing indicators
    if (data.type === 'typing_indicator') {
        console.log('⌨️  Someone is typing...');
    }
};

ws.onclose = () => {
    console.log('❌ Vendor WebSocket Disconnected');
};

ws.onerror = (err) => {
    console.error('⚠️  WebSocket Error:', err);
};

// Helper function to send messages
window.sendVendorMessage = function(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket not connected!');
        return false;
    }
    
    ws.send(JSON.stringify({
        type: 'send_message',
        data: { 
            conversationId: 1, 
            content: text, 
            messageType: 'text' 
        }
    }));
    
    console.log('💬 Sent:', text);
    return true;
};

// Helper to send typing indicator
window.sendTyping = function(isTyping = true) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket not connected!');
        return false;
    }
    
    ws.send(JSON.stringify({
        type: 'typing',
        data: { 
            conversationId: 1, 
            isTyping: isTyping 
        }
    }));
    
    console.log(isTyping ? '⌨️  Started typing' : '⏹️  Stopped typing');
    return true;
};

// Auto-send test message after 2 seconds
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        sendVendorMessage('Hello Admin! This is an automated test message from vendor.');
    }
}, 2000);

console.log('✅ WebSocket test script loaded!');
console.log('');
console.log('Available commands:');
console.log('  sendVendorMessage("your text")  - Send a message to admin');
console.log('  sendTyping(true)                - Start typing indicator');
console.log('  sendTyping(false)               - Stop typing indicator');
console.log('');
console.log('Waiting for connection...');
