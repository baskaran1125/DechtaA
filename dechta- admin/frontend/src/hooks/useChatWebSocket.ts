import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage, ChatConversation } from "@/types";

const WS_BASE = (() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}`;
})();

type WsStatus = "connecting" | "connected" | "disconnected";

interface UseChatWebSocketOptions {
    entityType: string;
    entityId: string;
    conversationId: number | null;
    onMessage?: (msg: ChatMessage) => void;
    onConversationUpdate?: (convos: ChatConversation[]) => void;
}

export function useChatWebSocket({
    entityType,
    entityId,
    conversationId,
    onMessage,
}: UseChatWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<WsStatus>("disconnected");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const joinedConvoRef = useRef<number | null>(null);

    // Connect / reconnect
    useEffect(() => {
        if (!entityType || !entityId) return;

        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout>;
        let alive = true;

        const connect = () => {
            setStatus("connecting");
            ws = new WebSocket(`${WS_BASE}/ws/chat?entityType=${entityType}&entityId=${entityId}`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!alive) { ws.close(); return; }
                setStatus("connected");

                // Join the active conversation room immediately
                if (conversationId) {
                    ws.send(JSON.stringify({ type: "join_conversation", data: { conversationId } }));
                    joinedConvoRef.current = conversationId;
                }
            };

            ws.onmessage = (evt) => {
                try {
                    const payload = JSON.parse(evt.data);
                    if (payload.type === "new_message" && onMessage) {
                        onMessage(payload.data as ChatMessage);
                    }
                    if (payload.type === "message_sent" && onMessage) {
                        onMessage(payload.data as ChatMessage);
                    }
                    if (payload.type === "typing_indicator") {
                        const { entityType: t, entityId: id, isTyping } = payload.data;
                        if (t !== entityType || id !== entityId) {
                            // Someone else is typing
                            if (isTyping) {
                                setTypingUser(`${t}:${id}`);
                                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                                typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
                            } else {
                                setTypingUser(null);
                            }
                        }
                    }
                } catch { /* ignore */ }
            };

            ws.onclose = () => {
                setStatus("disconnected");
                if (alive) {
                    reconnectTimer = setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                setStatus("disconnected");
            };
        };

        connect();

        return () => {
            alive = false;
            clearTimeout(reconnectTimer);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            ws?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType, entityId]);

    // Join a new conversation when conversationId changes
    useEffect(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !conversationId) return;
        if (joinedConvoRef.current === conversationId) return;

        ws.send(JSON.stringify({ type: "join_conversation", data: { conversationId } }));
        joinedConvoRef.current = conversationId;
    }, [conversationId, status]);

    const sendMessage = useCallback((content: string) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !conversationId) return false;
        ws.send(JSON.stringify({
            type: "send_message",
            data: { conversationId, content, messageType: "text" },
        }));
        return true;
    }, [conversationId]);

    const sendTyping = useCallback((isTyping: boolean) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !conversationId) return;
        ws.send(JSON.stringify({ type: "typing", data: { conversationId, isTyping } }));
    }, [conversationId]);

    const markRead = useCallback(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !conversationId) return;
        ws.send(JSON.stringify({ type: "mark_read", data: { conversationId } }));
    }, [conversationId]);

    return { status, typingUser, sendMessage, sendTyping, markRead };
}
