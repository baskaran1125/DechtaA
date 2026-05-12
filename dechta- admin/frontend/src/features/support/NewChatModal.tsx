import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, MessageSquarePlus, Search, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Driver, Manpower, Client, ChatConversation } from "@/types";

// Vendor alias from PendingVendor shape
type VendorItem = { id: number; name: string; email: string; verificationStatus: string };
type ManpowerItem = { id: string; fullName: string; phone: string; skill: string | null };
type ClientItem = { id: number; name: string; email: string; phone: string };
type DriverItem = { id: number; name: string; phone: string; vehicleType: string };

type EntityTab = "vendor" | "client" | "driver" | "worker";

interface NewChatModalProps {
    onClose: () => void;
    onCreated: (convo: ChatConversation) => void;
}

const TABS: { key: EntityTab; label: string; color: string }[] = [
    { key: "vendor", label: "Vendor", color: "bg-violet-100 text-violet-700" },
    { key: "client", label: "Client", color: "bg-emerald-100 text-emerald-700" },
    { key: "driver", label: "Driver", color: "bg-cyan-100 text-cyan-700" },
    { key: "worker", label: "Manpower", color: "bg-amber-100 text-amber-700" },
];

export default function NewChatModal({ onClose, onCreated }: NewChatModalProps) {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<EntityTab>("vendor");
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [subject, setSubject] = useState("");

    const { data: vendors } = useQuery<VendorItem[]>({
        queryKey: ["/api/ops/onboarding/vendors/all"],
        queryFn: async () => {
            const r = await fetch("/api/ops/onboarding/vendors/all", { credentials: "include" });
            if (!r.ok) return [];
            const data = await r.json();
            return data;
        },
        enabled: activeTab === "vendor",
    });

    const { data: clients } = useQuery<ClientItem[]>({
        queryKey: ["/api/ops/clients"],
        queryFn: async () => {
            const r = await fetch("/api/ops/clients", { credentials: "include" });
            if (!r.ok) return [];
            return r.json();
        },
        enabled: activeTab === "client",
    });

    const { data: drivers } = useQuery<DriverItem[]>({
        queryKey: ["/api/ops/drivers"],
        queryFn: async () => {
            const r = await fetch("/api/ops/drivers", { credentials: "include" });
            if (!r.ok) return [];
            return r.json();
        },
        enabled: activeTab === "driver",
    });

    const { data: manpower } = useQuery<ManpowerItem[]>({
        queryKey: ["/api/ops/manpower"],
        queryFn: async () => {
            const r = await fetch("/api/ops/manpower", { credentials: "include" });
            if (!r.ok) return [];
            return r.json();
        },
        enabled: activeTab === "worker",
    });

    // Reset on tab change
    const handleTabChange = (tab: EntityTab) => {
        setActiveTab(tab);
        setSelectedId(null);
        setSearch("");
    };

    const startChatMutation = useMutation({
        mutationFn: async () => {
            if (!selectedId) throw new Error("Select a person first");
            const res = await apiRequest("POST", "/api/ops/support/conversations/start", {
                withEntityType: activeTab,
                withEntityId: selectedId,
                subject: subject.trim() || undefined,
            }) as unknown as ChatConversation;
            return res;
        },
        onSuccess: (convo) => {
            qc.invalidateQueries({ queryKey: ["/api/ops/support/conversations"] });
            toast({ title: "Chat started!" });
            onCreated(convo);
            onClose();
        },
        onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
    });

    // Get list items for current tab
    const getItems = (): { id: string; name: string; sub: string }[] => {
        const q = search.toLowerCase();
        if (activeTab === "vendor") {
            return (vendors ?? [])
                .filter((v) => v.name.toLowerCase().includes(q) || v.email.toLowerCase().includes(q))
                .map((v) => ({ id: String(v.id), name: v.name, sub: v.email }));
        }
        if (activeTab === "client") {
            return (clients ?? [])
                .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
                .map((c) => ({ id: String(c.id), name: c.name, sub: c.email }));
        }
        if (activeTab === "driver") {
            return (drivers ?? [])
                .filter((d) => d.name.toLowerCase().includes(q))
                .map((d) => ({ id: String(d.id), name: d.name, sub: d.vehicleType }));
        }
        if (activeTab === "worker") {
            return (manpower ?? [])
                .filter((w) => w.fullName.toLowerCase().includes(q))
                .map((w) => ({ id: String(w.id), name: w.fullName, sub: w.skill ?? "Manpower" }));
        }
        return [];
    };

    const items = getItems();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-cyan-600" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">New Support Chat</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 px-5 pt-4">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => handleTabChange(t.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? t.color + " ring-1 ring-offset-1" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="px-5 pt-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
                            placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label ?? ""}s…`}
                            className="pl-8 h-8 text-sm rounded-lg"
                        />
                    </div>
                </div>

                {/* Entity list */}
                <div className="flex-1 overflow-y-auto px-5 pb-2">
                    {items.length === 0 ? (
                        <div className="text-center text-sm text-gray-400 py-8">No results</div>
                    ) : (
                        <div className="space-y-1">
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${selectedId === item.id ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.sub}</p>
                                    </div>
                                    {selectedId === item.id && <ChevronRight className="h-4 w-4 text-cyan-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subject */}
                {selectedId && (
                    <div className="px-5 pt-2 pb-2">
                        <Label className="text-xs text-gray-600 mb-1 block">Chat subject (optional)</Label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Payment issue, Document query…"
                            className="text-sm h-9 rounded-xl"
                            maxLength={100}
                        />
                    </div>
                )}

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
                    <Button
                        onClick={() => startChatMutation.mutate()}
                        disabled={!selectedId || startChatMutation.isPending}
                        className="rounded-xl bg-cyan-600 hover:bg-cyan-700 gap-2"
                    >
                        {startChatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                        Start Chat
                    </Button>
                </div>
            </div>
        </div>
    );
}
