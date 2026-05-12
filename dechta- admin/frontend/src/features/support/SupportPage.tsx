import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Ticket, LayoutPanelLeft } from "lucide-react";
import type { ChatConversation, SupportTicket } from "@/types";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import NewChatModal from "./NewChatModal";

// ─── Empty state placeholder ──────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-gray-400 select-none">
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center">
                    <MessageSquareText className="h-9 w-9 text-cyan-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Ticket className="h-3.5 w-3.5 text-white" />
                </div>
            </div>
            <div className="text-center">
                <p className="text-base font-semibold text-gray-500 dark:text-gray-400">Select a conversation</p>
                <p className="text-sm text-gray-400 mt-1">Choose a chat from the left, or start a new one</p>
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SupportPageProps {
    supportTickets: SupportTicket[] | undefined;
    ticketsLoading: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SupportPage({ supportTickets, ticketsLoading }: SupportPageProps) {
    const qc = useQueryClient();
    const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
    const [showNewChat, setShowNewChat] = useState(false);

    // ─ Fetch all support conversations for the left panel ─
    const { data: conversations, isLoading: convosLoading } = useQuery<ChatConversation[]>({
        queryKey: ["/api/ops/support/conversations"],
        queryFn: async () => {
            const r = await fetch("/api/ops/support/conversations", { credentials: "include" });
            if (!r.ok) throw new Error("Failed to load conversations");
            return r.json();
        },
        refetchInterval: 15000, // poll every 15s as fallback
        staleTime: 5000,
    });

    // Auto-select first conversation on load
    useEffect(() => {
        if (!activeConvoId && conversations && conversations.length > 0) {
            setActiveConvoId(conversations[0].id);
        }
    }, [conversations, activeConvoId]);

    const activeConvo = conversations?.find((c) => c.id === activeConvoId) ?? null;

    return (
        <div className="flex w-full h-full min-h-0">
            {/* ── Left panel: conversation list ── */}
            <ConversationList
                conversations={conversations ?? []}
                activeId={activeConvoId}
                onSelect={(id) => {
                    setActiveConvoId(id);
                }}
                onNewChat={() => setShowNewChat(true)}
                loading={convosLoading}
            />

            {/* ── Right panel: chat window / empty state ── */}
            <div className="flex flex-1 min-w-0 h-full">
                {activeConvo ? (
                    <ChatWindow
                        key={activeConvo.id}
                        conversation={activeConvo}
                        onStatusChange={() => {
                            qc.invalidateQueries({ queryKey: ["/api/ops/support/conversations"] });
                            qc.invalidateQueries({ queryKey: ["/api/ops/support"] });
                        }}
                    />
                ) : (
                    <EmptyState />
                )}
            </div>

            {/* ── New Chat Modal ── */}
            {showNewChat && (
                <NewChatModal
                    onClose={() => setShowNewChat(false)}
                    onCreated={(convo) => {
                        qc.invalidateQueries({ queryKey: ["/api/ops/support/conversations"] });
                        setActiveConvoId(convo.id);
                    }}
                />
            )}
        </div>
    );
}
