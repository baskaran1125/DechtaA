import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Loader2, Package, Tag, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PendingProduct } from "@/types";

interface ProductApprovalsPageProps {
    pendingProducts: PendingProduct[] | undefined;
    pendingProductsLoading: boolean;
    allProducts: PendingProduct[] | undefined;
    allProductsLoading: boolean;
}

type FilterTab = "pending" | "approved" | "rejected" | "all";

export default function ProductApprovalsPage({
    pendingProducts,
    pendingProductsLoading,
    allProducts,
    allProductsLoading,
}: ProductApprovalsPageProps) {
    const { toast } = useToast();
    const [filter, setFilter] = useState<FilterTab>("pending");
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [imageLoadError, setImageLoadError] = useState<Record<number, boolean>>({});

    const resolveBackendBase = () => {
        const envBase = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
        if (envBase) return envBase;
        if (import.meta.env.DEV) {
            return `${window.location.protocol}//${window.location.hostname}:5003`;
        }
        return `${window.location.protocol}//${window.location.host}`;
    };

    const normalizeImageSrc = (raw: unknown): string | null => {
        if (raw === null || raw === undefined) return null;

        const parseAny = (value: unknown): string | null => {
            if (!value) return null;

            if (Array.isArray(value)) {
                for (const item of value) {
                    const nested = parseAny(item);
                    if (nested) return nested;
                }
                return null;
            }

            if (typeof value !== "string") return null;
            let s = value.trim();
            if (!s) return null;

            if (s.startsWith("[") || s.startsWith("{") || s.startsWith("\"")) {
                try {
                    const parsed = JSON.parse(s);
                    const nested = parseAny(parsed);
                    if (nested) return nested;
                } catch {
                    // Not JSON, continue with string handling below.
                }
            }

            if (s.startsWith("data:image") || /^https?:\/\//i.test(s)) return s;

            if (s.startsWith("//")) {
                return `${window.location.protocol}${s}`;
            }

            if (s.startsWith("/")) {
                return `${resolveBackendBase()}${s}`;
            }

            // Handle plain relative upload paths like "uploads/abc.jpg".
            if (/^uploads\//i.test(s)) {
                return `${resolveBackendBase()}/${s}`;
            }

            // Legacy payloads can still contain backend on 5000 while the admin backend runs on 5003.
            s = s.replace(/(https?:\/\/[^/:]+):5000\//i, `$1:5003/`);

            return s;
        };

        return parseAny(raw);
    };

    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("PATCH", `/api/ops/products/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/products/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/products"] });
            toast({ title: "Product Approved", description: "The product is now visible to buyers." });
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
            await apiRequest("PATCH", `/api/ops/products/${id}/reject`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/products/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/products"] });
            setRejectDialogOpen(false);
            setRejectionReason("");
            setSelectedProductId(null);
            toast({ title: "Product Rejected", description: "The vendor has been notified with the reason." });
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        },
    });

    const handleRejectClick = (productId: number) => {
        setSelectedProductId(productId);
        setRejectionReason("");
        setRejectDialogOpen(true);
    };

    const handleRejectConfirm = () => {
        if (selectedProductId && rejectionReason.trim()) {
            rejectMutation.mutate({ id: selectedProductId, reason: rejectionReason.trim() });
        }
    };

    const isLoading = filter === "pending" ? pendingProductsLoading : allProductsLoading;

    const filteredProducts = (() => {
        if (filter === "pending") return pendingProducts || [];
        const all = allProducts || [];
        if (filter === "all") return all;
        return all.filter((p) => p.approvalStatus === filter);
    })();

    const pendingCount = pendingProducts?.length || 0;

    const FILTER_TABS: { key: FilterTab; label: string }[] = [
        { key: "pending", label: `Pending (${pendingCount})` },
        { key: "approved", label: "Approved" },
        { key: "rejected", label: "Rejected" },
        { key: "all", label: "All" },
    ];

    const statusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case "approved":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
            case "rejected":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Product Approvals</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and approve vendor-submitted products before they appear on the marketplace.
                    </p>
                </div>
                {pendingCount > 0 && (
                    <Badge className="bg-yellow-500 text-white text-sm px-3 py-1">
                        {pendingCount} pending
                    </Badge>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                {FILTER_TABS.map(({ key, label }) => (
                    <Button
                        key={key}
                        onClick={() => setFilter(key)}
                        variant="ghost"
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                            filter === key
                                ? "bg-black text-cyan-400 shadow-md"
                                : "text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        <Filter className="w-3 h-3 mr-1" />
                        {label}
                    </Button>
                ))}
            </div>

            {/* Products List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Package className="w-14 h-14 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">No {filter} products</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        {filter === "pending"
                            ? "All products have been reviewed. Great job!"
                            : `No products with status "${filter}" found.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredProducts.map((product) => {
                        const imageSrc = normalizeImageSrc((product as any).imageUrl ?? (product as any).image_url ?? (product as any).images);
                        const hideImage = imageLoadError[product.id] || !imageSrc;

                        return (
                            <Card
                                key={product.id}
                                className="overflow-hidden hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden">
                                    {!hideImage ? (
                                        <img
                                            src={imageSrc || undefined}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            onError={() => setImageLoadError((prev) => ({ ...prev, [product.id]: true }))}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Tag className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        {statusBadge(product.approvalStatus)}
                                    </div>
                                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-700 shadow-sm">
                                        {product.category}
                                    </div>
                                </div>

                                <CardContent className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-base text-gray-900">{product.name}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-900">
                                            ${Number(product.price).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Vendor #{product.vendorId}
                                        </span>
                                    </div>

                                    {product.approvalStatus === "rejected" && product.rejectionReason && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-xs font-medium text-red-700">Rejection Reason:</p>
                                            <p className="text-xs text-red-600 mt-1">{product.rejectionReason}</p>
                                        </div>
                                    )}

                                    {product.approvalStatus === "pending" && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                onClick={() => approveMutation.mutate(product.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                size="sm"
                                            >
                                                {approveMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => handleRejectClick(product.id)}
                                                disabled={rejectMutation.isPending}
                                                variant="destructive"
                                                className="flex-1"
                                                size="sm"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Rejection Reason Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Product</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this product. The vendor will see this reason.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason.trim() || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                                <XCircle className="w-4 h-4 mr-1" />
                            )}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
