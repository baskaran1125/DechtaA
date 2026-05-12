import { useState } from "react";
import { Search, Plus, MessageSquare, Clock, AlertCircle } from "lucide-react";
import type { ChatConversation } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ConversationListProps {
    conversations: ChatConversation[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onNewChat: () => void;
    loading: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-yellow-400",
    low: "bg-gray-400",
};

const PARTICIPANT_COLORS: Record<string, string> = {
    user: "bg-blue-500",
    vendor: "bg-violet-500",
    client: "bg-emerald-500",
    worker: "bg-amber-500",
    driver: "bg-cyan-500",
};

function getInitials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

function timeAgo(dateStr: string | null) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

export default function ConversationList({
    conversations,
    activeId,
    onSelect,
    onNewChat,
    loading,
}: ConversationListProps) {
    const [search, setSearch] = useState("");

    const filtered = conversations.filter((c) => {
        const q = search.toLowerCase();
        const title = (c.title ?? c.otherParticipant?.name ?? "").toLowerCase();
        const ticketSubject = (c.supportTicket?.subject ?? "").toLowerCase();
        const lastMsg = (c.lastMessage?.content ?? "").toLowerCase();
        return title.includes(q) || ticketSubject.includes(q) || lastMsg.includes(q);
    });

    return (
        <div className="flex flex-col h-full w-72 min-w-[240px] max-w-xs border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Support Chats</h2>
                    <Button
                        size="sm"
                        onClick={onNewChat}
                        className="h-7 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs gap-1"
                    >
                        <Plus className="h-3.5 w-3.5" /> New
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chats..."
                        className="pl-8 h-8 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 text-sm">
                        <MessageSquare className="h-8 w-8 opacity-30" />
                        {search ? "No chats found" : "No chats yet"}
                    </div>
                ) : (
                    <div>
                        {filtered.map((convo) => {
                            const isActive = convo.id === activeId;
                            const name =
                                convo.supportTicket?.subject
                                    ? convo.supportTicket.subject.replace(/^\[.*?\]\s*/, "")
                                    : convo.title ?? convo.otherParticipant?.name ?? "Unknown";
                            const participantName = convo.otherParticipant?.name ?? "Unknown";
                            const participantType = convo.otherParticipant?.type ?? "user";
                            const priority = convo.supportTicket?.priority;
                            const ticketStatus = convo.supportTicket?.status;

                            return (
                                <button
                                    key={convo.id}
                                    onClick={() => onSelect(convo.id)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-gray-50 dark:border-gray-800 hover:bg-cyan-50/60 dark:hover:bg-gray-800/60 ${isActive ? "bg-cyan-50 dark:bg-gray-800 border-l-2 border-l-cyan-500" : ""}`}
                                >
                                    {/* Avatar */}
                                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${PARTICIPANT_COLORS[participantType] ?? "bg-gray-500"}`}>
                                        {getInitials(participantName)}
                                        {convo.unreadCount && convo.unreadCount > 0 ? (
                                            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                                {convo.unreadCount > 9 ? "9+" : convo.unreadCount}
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={`text-sm font-semibold truncate ${isActive ? "text-cyan-700 dark:text-cyan-400" : "text-gray-900 dark:text-gray-100"}`}>
                                                {name.length > 28 ? name.slice(0, 28) + "…" : name}
                                            </span>
                                            <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-0.5">
                                                <Clock className="h-2.5 w-2.5" />
                                                {timeAgo(convo.lastMessageAt ?? convo.createdAt)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize text-white ${PARTICIPANT_COLORS[participantType] ?? "bg-gray-400"}`}>
                                                {participantType}
                                            </span>
                                            {priority && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[priority] ?? "bg-gray-400"}`} title={`Priority: ${priority}`} />
                                            )}
                                            {ticketStatus && (
                                                <span className="text-[10px] text-gray-400 capitalize">{ticketStatus}</span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-relaxed">
                                            {convo.lastMessage?.messageType === "system"
                                                ? <span className="italic">{convo.lastMessage.content}</span>
                                                : convo.lastMessage?.content ?? "No messages yet"}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
