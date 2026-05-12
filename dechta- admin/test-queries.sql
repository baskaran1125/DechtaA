-- ========================================
-- DECHTA SUPPORT CHAT - DATABASE TEST QUERIES
-- ========================================
-- Run these queries in PostgreSQL (psql or pgAdmin) to verify chat system

-- ========================================
-- SECTION 1: ENVIRONMENT CHECK
-- ========================================

-- Check if test users exist
SELECT 
    'Test Users' as check_name,
    COUNT(*) as count,
    STRING_AGG(email || ' (' || role || ')', ', ') as users
FROM users 
WHERE role IN ('admin', 'vendor', 'buyer')
GROUP BY check_name;

-- Check table counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Support Tickets', COUNT(*) FROM support_tickets
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
ORDER BY count DESC;

-- ========================================
-- SECTION 2: VIEW SUPPORT CONVERSATIONS
-- ========================================

-- List all support conversations with details
SELECT 
    c.id as conversation_id,
    c.participant1Type || ':' || c.participant1Id as participant1,
    c.participant2Type || ':' || c.participant2Id as participant2,
    c.conversationType,
    c.status,
    c.lastMessageAt,
    st.subject as ticket_subject,
    st.status as ticket_status,
    st.priority as ticket_priority,
    COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN support_tickets st ON c.supportTicketId = st.id
LEFT JOIN messages m ON m.conversationId = c.id
WHERE c.conversationType = 'support'
GROUP BY c.id, st.subject, st.status, st.priority
ORDER BY c.lastMessageAt DESC NULLS LAST;

-- View conversations with participant names
SELECT 
    c.id,
    c.participant1Type,
    CASE 
        WHEN c.participant1Type = 'user' THEN (SELECT name FROM users WHERE id = c.participant1Id::int)
        WHEN c.participant1Type = 'client' THEN (SELECT name FROM clients WHERE id = c.participant1Id::int)
        WHEN c.participant1Type = 'driver' THEN (SELECT name FROM drivers WHERE id = c.participant1Id::int)
        ELSE 'Unknown'
    END as participant1_name,
    c.participant2Type,
    CASE 
        WHEN c.participant2Type = 'user' THEN (SELECT name FROM users WHERE id = c.participant2Id::int)
        WHEN c.participant2Type = 'client' THEN (SELECT name FROM clients WHERE id = c.participant2Id::int)
        WHEN c.participant2Type = 'driver' THEN (SELECT name FROM drivers WHERE id = c.participant2Id::int)
        ELSE 'Unknown'
    END as participant2_name,
    c.title,
    c.status
FROM conversations c
WHERE c.conversationType = 'support'
ORDER BY c.id;

-- ========================================
-- SECTION 3: VIEW RECENT MESSAGES
-- ========================================

-- Last 20 messages across all conversations
SELECT 
    m.id,
    m.conversationId,
    m.senderType || ':' || m.senderId as sender,
    m.content,
    m.messageType,
    m.createdAt,
    m.readAt
FROM messages m
ORDER BY m.createdAt DESC
LIMIT 20;

-- Messages in conversation 1 (for testing)
SELECT 
    m.id,
    m.senderType,
    m.senderId,
    CASE 
        WHEN m.senderType = 'user' AND m.senderId = '0' THEN 'Admin'
        WHEN m.senderType = 'user' THEN (SELECT name FROM users WHERE id = m.senderId::int)
        ELSE m.senderType || ':' || m.senderId
    END as sender_name,
    m.content,
    m.messageType,
    TO_CHAR(m.createdAt, 'YYYY-MM-DD HH24:MI:SS') as sent_at,
    CASE WHEN m.readAt IS NOT NULL THEN 'Read' ELSE 'Unread' END as status
FROM messages m
WHERE m.conversationId = 1
ORDER BY m.createdAt ASC;

-- ========================================
-- SECTION 4: CREATE TEST DATA
-- ========================================

-- Create test conversation (if not exists)
INSERT INTO conversations (
    participant1Type, participant1Id,
    participant2Type, participant2Id,
    title, conversationType, status
) 
SELECT 
    'user', '0',
    'user', '1',
    'Test Support Chat - Conversation 1',
    'support',
    'active'
WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE id = 1)
RETURNING id, title, status;

-- Create test support ticket
INSERT INTO support_tickets (userId, subject, description, status, priority)
SELECT 
    1,
    'Test Support Ticket - Product Approval Issue',
    'This is a test ticket created for WebSocket testing purposes.',
    'open',
    'medium'
WHERE NOT EXISTS (SELECT 1 FROM support_tickets WHERE subject LIKE 'Test Support Ticket%')
RETURNING id, subject, status, priority;

-- Link conversation to support ticket (update existing conversation)
UPDATE conversations
SET supportTicketId = (SELECT id FROM support_tickets WHERE subject LIKE 'Test Support Ticket%' LIMIT 1)
WHERE id = 1 AND supportTicketId IS NULL
RETURNING id, supportTicketId;

-- Insert test messages
INSERT INTO messages (conversationId, senderType, senderId, content, messageType)
VALUES
    (1, 'user', '1', 'Hello Admin, I have a question about my product.', 'text'),
    (1, 'user', '0', 'Hi! I''d be happy to help. What''s your question?', 'text'),
    (1, 'user', '1', 'My product has been pending approval for 3 days. Is there an issue?', 'text'),
    (1, 'user', '0', 'Let me check that for you. What''s your product ID?', 'text'),
    (1, 'user', '1', 'Product ID is 42. Thank you!', 'text')
ON CONFLICT DO NOTHING;

-- Verify test data created
SELECT 
    'Test conversation created' as status,
    id, title 
FROM conversations 
WHERE id = 1;

SELECT 
    'Test messages created' as status,
    COUNT(*) as message_count 
FROM messages 
WHERE conversationId = 1;

-- ========================================
-- SECTION 5: TEST QUERIES
-- ========================================

-- TC-DB-001: Verify conversation polymorphic relationships
SELECT 
    c.id,
    c.participant1Type, c.participant1Id,
    c.participant2Type, c.participant2Id,
    CASE 
        WHEN c.participant1Type = 'user' THEN (SELECT name FROM users WHERE id = c.participant1Id::int)
        ELSE 'Non-user participant'
    END as p1_name,
    CASE 
        WHEN c.participant2Type = 'user' THEN (SELECT name FROM users WHERE id = c.participant2Id::int)
        ELSE 'Non-user participant'
    END as p2_name
FROM conversations c
WHERE c.id = 1;

-- TC-DB-002: Verify messages foreign key constraints
-- This should succeed (valid conversation)
INSERT INTO messages (conversationId, senderType, senderId, content, messageType)
VALUES (1, 'user', '0', 'Test message - should succeed', 'text')
RETURNING id, content;

-- This should FAIL (invalid conversation ID)
-- Uncomment to test:
-- INSERT INTO messages (conversationId, senderType, senderId, content, messageType)
-- VALUES (9999, 'user', '0', 'Test message - should FAIL', 'text');

-- TC-DB-003: Verify support ticket linkage
SELECT 
    c.id as conversation_id,
    c.supportTicketId,
    st.id as ticket_id,
    st.subject,
    st.status,
    st.priority,
    COUNT(m.id) as message_count
FROM conversations c
INNER JOIN support_tickets st ON c.supportTicketId = st.id
LEFT JOIN messages m ON m.conversationId = c.id
WHERE c.conversationType = 'support'
GROUP BY c.id, st.id, st.subject, st.status, st.priority
ORDER BY c.id;

-- ========================================
-- SECTION 6: MONITORING QUERIES
-- ========================================

-- Real-time message activity (last 5 minutes)
SELECT 
    COUNT(*) as recent_messages,
    COUNT(DISTINCT conversationId) as active_conversations,
    MAX(createdAt) as last_message_at
FROM messages
WHERE createdAt > NOW() - INTERVAL '5 minutes';

-- Unread message counts by conversation
SELECT 
    m.conversationId,
    c.title,
    COUNT(*) as unread_count
FROM messages m
INNER JOIN conversations c ON m.conversationId = c.id
WHERE m.readAt IS NULL
  AND m.senderType != 'user'
  AND m.senderId != '0'
GROUP BY m.conversationId, c.title
ORDER BY unread_count DESC;

-- Support ticket status summary
SELECT 
    st.status,
    st.priority,
    COUNT(*) as count
FROM support_tickets st
GROUP BY st.status, st.priority
ORDER BY 
    CASE st.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    st.status;

-- ========================================
-- SECTION 7: CLEANUP QUERIES
-- ========================================

-- Delete test messages (optional cleanup)
-- Uncomment to run:
-- DELETE FROM messages WHERE conversationId = 1 AND content LIKE 'Test message%';

-- Delete test conversation (optional cleanup)
-- Uncomment to run:
-- DELETE FROM conversations WHERE id = 1 AND title LIKE 'Test Support Chat%';

-- Delete test support ticket (optional cleanup)
-- Uncomment to run:
-- DELETE FROM support_tickets WHERE subject LIKE 'Test Support Ticket%';

-- ========================================
-- SECTION 8: PERFORMANCE QUERIES
-- ========================================

-- Check message table size and indexes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE tablename IN ('messages', 'conversations', 'support_tickets')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for missing indexes (recommend if slow queries)
SELECT 
    'Recommend index on messages(conversationId)' as recommendation
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexdef LIKE '%conversationId%'
);

-- ========================================
-- END OF TEST QUERIES
-- ========================================

-- Summary: Show test readiness
SELECT 
    'TEST READINESS CHECK' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'admin') > 0 
         AND (SELECT COUNT(*) FROM users WHERE role = 'vendor') > 0
         AND (SELECT COUNT(*) FROM conversations) > 0
        THEN '✅ READY TO TEST'
        ELSE '❌ MISSING TEST DATA - Run seed script'
    END as status;
