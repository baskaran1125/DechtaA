import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Send, Loader2, ChevronDown, User, CheckCheck,
    Info, AlertTriangle, MoreVertical, X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import type { ChatMessage, ChatConversation } from "@/types";
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatWindowProps {
    conversation: ChatConversation;
    onClose?: () => void;
    onStatusChange?: (convoId: number, newStatus: string) => void;
}

const TICKET_STATUS_OPTIONS = [
    { value: "open", label: "Open", color: "text-yellow-600" },
    { value: "in-progress", label: "In Progress", color: "text-blue-600" },
    { value: "resolved", label: "Resolved", color: "text-green-600" },
    { value: "closed", label: "Closed", color: "text-gray-500" },
];

const PRIORITY_PILL: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-600",
};

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
}

export default function ChatWindow({ conversation, onClose, onStatusChange }: ChatWindowProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch message history via REST
    const { data: historyMessages, isLoading: historyLoading } = useQuery<ChatMessage[]>({
        queryKey: [`/api/chat/conversations/${conversation.id}/messages`],
        queryFn: async () => {
            const res = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load messages");
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    // Merge history + local live messages (dedup by id)
    const allMessages = (() => {
        const base = historyMessages ?? [];
        const ids = new Set(base.map((m) => m.id));
        const live = localMessages.filter((m) => !ids.has(m.id));
        return [...base, ...live].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    })();

    // WebSocket live updates
    const { status: wsStatus, typingUser, sendMessage: wsSend, sendTyping, markRead } = useChatWebSocket({
        entityType: "user",
        entityId: "0",
        conversationId: conversation.id,
        onMessage: (msg) => {
            setLocalMessages((prev) => {
                const exists = prev.find((m) => m.id === msg.id);
                return exists ? prev : [...prev, msg];
            });
        },
    });

    // REST fallback send (used when WS not connected)
    const sendRestMutation = useMutation({
        mutationFn: async (content: string) => {
            return apiRequest("POST", `/api/chat/conversations/${conversation.id}/messages`, {
                content,
                messageType: "text",
            });
        },
        onSuccess: (msg: any) => {
            setLocalMessages((prev) => {
                const exists = prev.find((m) => m.id === msg.id);
                return exists ? prev : [...prev, msg];
            });
            queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${conversation.id}/messages`] });
        },
        onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
    });

    // Status update
    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            if (!conversation.supportTicketId) throw new Error("No ticket");
            return apiRequest("PATCH", `/api/ops/support/${conversation.supportTicketId}/status`, {
                status: newStatus,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/support"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/support/conversations"] });
            onStatusChange?.(conversation.id, "updated");
            toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages.length]);

    // Mark as read when window is focused
    useEffect(() => {
        markRead();
    }, [conversation.id, markRead]);

    // Reset local messages when conversation changes
    useEffect(() => {
        setLocalMessages([]);
        setInput("");
    }, [conversation.id]);

    const handleSend = useCallback(() => {
        const content = input.trim();
        if (!content) return;
        setInput("");

        if (wsStatus === "connected") {
            wsSend(content);
        } else {
            sendRestMutation.mutate(content);
        }
    }, [input, wsStatus, wsSend, sendRestMutation]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        sendTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => sendTyping(false), 1500);
    };

    // Group messages by date
    const grouped: { date: string; messages: ChatMessage[] }[] = [];
    allMessages.forEach((msg) => {
        const d = formatDate(msg.createdAt);
        const last = grouped[grouped.length - 1];
        if (last && last.date === d) {
            last.messages.push(msg);
        } else {
            grouped.push({ date: d, messages: [msg] });
        }
    });

    const ticket = conversation.supportTicket;
    const participantName = conversation.otherParticipant?.name ?? ticket?.subject ?? "Unknown";
    const participantType = conversation.otherParticipant?.type ?? "user";

    return (
        <div className="flex flex-col w-full h-full min-w-0 bg-gray-50 dark:bg-gray-950">
            {/* ─── Header ─────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Participant avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    <User className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {participantName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium capitalize">
                            {participantType}
                        </span>
                        {ticket?.priority && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${PRIORITY_PILL[ticket.priority] ?? ""}`}>
                                {ticket.priority}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {/* WS status dot */}
                        <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-green-500" : wsStatus === "connecting" ? "bg-yellow-400" : "bg-gray-300"}`} />
                        <span className="text-[10px] text-gray-400 capitalize">{wsStatus}</span>
                        {ticket?.subject && (
                            <span className="text-[10px] text-gray-500 truncate">• {ticket.subject}</span>
                        )}
                    </div>
                </div>

                {/* Status changer */}
                {ticket && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1 rounded-lg">
                                {TICKET_STATUS_OPTIONS.find((o) => o.value === ticket.status)?.label ?? ticket.status}
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            {TICKET_STATUS_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                    key={opt.value}
                                    className={`text-sm ${opt.color}`}
                                    onClick={() => updateStatusMutation.mutate(opt.value)}
                                >
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="text-sm" onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${conversation.id}/messages`] })}>
                            Refresh messages
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {onClose && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onClose}>
                        <X className="h-4 w-4 text-gray-500" />
                    </Button>
                )}
            </div>

            {/* ─── Ticket info banner ──────────────────────── */}
            {ticket && (
                <div className="px-5 py-2 bg-cyan-50 dark:bg-cyan-950/40 border-b border-cyan-100 dark:border-cyan-900/50 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-cyan-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-cyan-700 dark:text-cyan-400 leading-relaxed">{ticket.description}</p>
                </div>
            )}

            {/* ─── Message area ────────────────────────────── */}
            <div
                className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,179,237,0.06) 1px, transparent 0)", backgroundSize: "24px 24px" }}
            >
                {historyLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                        <AlertTriangle className="h-7 w-7 opacity-30" />
                        <p className="text-sm">No messages yet. Say hello!</p>
                    </div>
                ) : (
                    grouped.map(({ date, messages: msgs }) => (
                        <div key={date}>
                            {/* Date divider */}
                            <div className="flex items-center gap-2 my-3">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                <span className="text-[11px] text-gray-400 font-medium px-2">{date}</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                            </div>

                            {msgs.map((msg, idx) => {
                                const isAdmin = msg.senderType === "user" && msg.senderId === "0";
                                const isSystem = msg.messageType === "system";

                                if (isSystem) {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-2">
                                            <span className="text-[11px] text-gray-400 italic bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                                {msg.content}
                                            </span>
                                        </div>
                                    );
                                }

                                const showAvatar = idx === 0 || msgs[idx - 1]?.senderType !== msg.senderType || msgs[idx - 1]?.senderId !== msg.senderId;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isAdmin ? "justify-end" : "justify-start"} mb-1`}
                                    >
                                        {/* Other-side avatar placeholder */}
                                        {!isAdmin && (
                                            <div className="w-6 mr-2 shrink-0 self-end">
                                                {showAvatar && (
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
                                                        {(msg.sender?.name ?? "?")[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={`max-w-[70%] group`}>
                                            {showAvatar && !isAdmin && (
                                                <p className="text-[10px] text-gray-400 mb-0.5 ml-1">
                                                    {msg.sender?.name ?? participantName}
                                                </p>
                                            )}
                                            <div
                                                className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                    isAdmin
                                                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm"
                                                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700"
                                                }`}
                                            >
                                                {msg.content}
                                                <div className={`flex items-center gap-1 mt-0.5 ${isAdmin ? "justify-end" : "justify-start"}`}>
                                                    <span className={`text-[10px] ${isAdmin ? "text-cyan-100" : "text-gray-400"}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                    {isAdmin && (
                                                        <CheckCheck className={`h-3 w-3 ${msg.readAt ? "text-cyan-200" : "text-cyan-300/60"}`} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}

                {/* Typing indicator */}
                {typingUser && (
                    <div className="flex items-center gap-2 ml-8 mt-1">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                            <div className="flex gap-1 items-center">
                                {[0, 150, 300].map((delay) => (
                                    <span
                                        key={delay}
                                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: `${delay}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* ─── Input bar ───────────────────────────────── */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end gap-2">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                        rows={1}
                        className="flex-1 min-h-[40px] max-h-28 resize-none text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-cyan-400 py-2.5"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || sendRestMutation.isPending}
                        className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md disabled:opacity-40"
                    >
                        {sendRestMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-[10px] text-gray-400 italic">
                        {wsStatus === "connected" ? "🟢 Live" : wsStatus === "connecting" ? "🟡 Connecting…" : "🔴 Offline – fallback REST"}
                    </span>
                    <span className="text-[10px] text-gray-300">{input.length}/500</span>
                </div>
            </div>
        </div>
    );
}
