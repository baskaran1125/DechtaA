import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Wrench, IndianRupee, Clock, Filter, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ManpowerPricing } from "@/types";

const SERVICE_CATEGORIES = [
    "Carpenter",
    "Mason",
    "Loadman",
    "Construction Helper",
    "Welder",
    "Gardener",
    "Electrician",
    "Custom",
];

export default function ManpowerPricingPage() {
    const { toast } = useToast();
    const [editingPricing, setEditingPricing] = useState<ManpowerPricing | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Form state
    const [formData, setFormData] = useState({
        serviceCategory: "",
        serviceName: "",
        serviceCode: "",
        description: "",
        basePrice: "",
        ratePerHour: "",
        minHours: "1",
        estimatedDuration: "",
    });

    // Fetch pricing data
    const { data: pricingList, isLoading } = useQuery<ManpowerPricing[]>({
        queryKey: ["/api/ops/manpower-pricing"],
    });

    // Create pricing
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/ops/manpower-pricing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create pricing");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/manpower-pricing"] });
            toast({ title: "Success", description: "Service pricing created successfully." });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Update pricing
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData & { isActive: boolean }> }) => {
            const res = await fetch(`/api/ops/manpower-pricing/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update pricing");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/manpower-pricing"] });
            toast({ title: "Success", description: "Service pricing updated successfully." });
            setEditingPricing(null);
            resetForm();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Seed default pricing
    const seedMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/ops/manpower-pricing/seed", {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to seed pricing");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/manpower-pricing"] });
            toast({ title: "Success", description: data.message });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Delete single pricing
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/ops/manpower-pricing/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to delete pricing");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/manpower-pricing"] });
            toast({ title: "Deleted", description: "Service pricing removed." });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Clear all pricing
    const clearAllMutation = useMutation({
        mutationFn: async () => {
            // Try bulk delete endpoint first; fall back to per-item deletes
            const bulkRes = await fetch("/api/ops/manpower-pricing", { method: "DELETE", credentials: "include" }).catch(() => null);
            if (bulkRes?.ok) return;
            // Fallback: delete every item individually
            const list = pricingList || [];
            await Promise.all(list.map(p =>
                fetch(`/api/ops/manpower-pricing/${p.id}`, { method: "DELETE", credentials: "include" })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/manpower-pricing"] });
            toast({ title: "Cleared", description: "All service pricings removed." });
            setConfirmClearOpen(false);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const [confirmClearOpen, setConfirmClearOpen] = useState(false);

    const resetForm = () => {
        setFormData({
            serviceCategory: "",
            serviceName: "",
            serviceCode: "",
            description: "",
            basePrice: "",
            ratePerHour: "",
            minHours: "1",
            estimatedDuration: "",
        });
    };

    const handleEdit = (pricing: ManpowerPricing) => {
        setEditingPricing(pricing);
        setFormData({
            serviceCategory: pricing.serviceCategory,
            serviceName: pricing.serviceName,
            serviceCode: pricing.serviceCode,
            description: pricing.description || "",
            basePrice: pricing.basePrice,
            ratePerHour: pricing.ratePerHour,
            minHours: pricing.minHours || "1",
            estimatedDuration: pricing.estimatedDuration || "",
        });
    };

    const handleSubmit = () => {
        if (!formData.serviceCategory || !formData.serviceName || !formData.serviceCode || !formData.basePrice || !formData.ratePerHour) {
            toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
            return;
        }

        if (editingPricing) {
            updateMutation.mutate({ id: editingPricing.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleToggleActive = (pricing: ManpowerPricing) => {
        updateMutation.mutate({ id: pricing.id, data: { isActive: !pricing.isActive } });
    };

    // Get unique categories from data
    const categories = [...new Set(pricingList?.map(p => p.serviceCategory) || [])].sort();

    // Filter pricing list
    const filteredPricing = pricingList?.filter(p =>
        categoryFilter === "all" || p.serviceCategory === categoryFilter
    ) || [];

    // Group by category for summary
    const categoryStats = categories.reduce((acc, cat) => {
        const items = pricingList?.filter(p => p.serviceCategory === cat) || [];
        acc[cat] = { total: items.length, active: items.filter(i => i.isActive).length };
        return acc;
    }, {} as Record<string, { total: number; active: number }>);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Service Pricing Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Set pricing for manpower services (like Urban Company)</p>
                </div>
                <div className="flex gap-3">
                    {(!pricingList || pricingList.length === 0) && (
                        <Button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            variant="outline"
                            className="h-10 rounded-lg border-violet-300 px-6 text-sm font-bold text-violet-600 hover:bg-violet-50"
                        >
                            {seedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Load Default Services
                        </Button>
                    )}
                    {pricingList && pricingList.length > 0 && (
                        <Button
                            onClick={() => setConfirmClearOpen(true)}
                            variant="outline"
                            className="h-10 rounded-lg border-red-300 px-5 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Clear All
                        </Button>
                    )}
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setEditingPricing(null);
                                }}
                                className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-violet-400 shadow-md transition-all hover:opacity-85"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Service
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add New Service Pricing</DialogTitle>
                            </DialogHeader>
                            <ServicePricingForm
                                formData={formData}
                                setFormData={setFormData}
                                onSubmit={handleSubmit}
                                isLoading={createMutation.isPending}
                                isEdit={false}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Category Stats */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-4">
                    <Badge
                        variant={categoryFilter === "all" ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-1.5 ${categoryFilter === "all" ? "bg-violet-600" : ""}`}
                        onClick={() => setCategoryFilter("all")}
                    >
                        All ({pricingList?.length || 0})
                    </Badge>
                    {categories.map(cat => (
                        <Badge
                            key={cat}
                            variant={categoryFilter === cat ? "default" : "outline"}
                            className={`cursor-pointer px-4 py-1.5 ${categoryFilter === cat ? "bg-violet-600" : ""}`}
                            onClick={() => setCategoryFilter(cat)}
                        >
                            {cat} ({categoryStats[cat]?.active}/{categoryStats[cat]?.total})
                        </Badge>
                    ))}
                </div>
            )}

            {/* Pricing Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Service Pricing</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Manage hourly rates for all service types</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" /></div>
                ) : filteredPricing.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="text-right">Base Price</TableHead>
                                    <TableHead className="text-right">Rate/hr</TableHead>
                                    <TableHead className="text-center">Min hrs</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPricing.map((pricing) => (
                                    <TableRow key={pricing.id}>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                                                {pricing.serviceCategory}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold max-w-[200px]">
                                            <div className="truncate" title={pricing.serviceName}>{pricing.serviceName}</div>
                                            {pricing.description && (
                                                <p className="text-xs text-gray-500 truncate" title={pricing.description}>{pricing.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-600">{pricing.serviceCode}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            <span className="inline-flex items-center"><IndianRupee className="w-3 h-3" />{pricing.basePrice}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">
                                            <span className="inline-flex items-center"><IndianRupee className="w-3 h-3" />{pricing.ratePerHour}/hr</span>
                                        </TableCell>
                                        <TableCell className="text-center text-gray-600">{pricing.minHours || 1}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {pricing.estimatedDuration && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{pricing.estimatedDuration}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={pricing.isActive}
                                                onCheckedChange={() => handleToggleActive(pricing)}
                                                disabled={updateMutation.isPending}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Dialog open={editingPricing?.id === pricing.id} onOpenChange={(open) => !open && setEditingPricing(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(pricing)}
                                                            className="h-8 rounded-lg border-gray-300 px-3 text-xs font-medium"
                                                        >
                                                            <Pencil className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-lg">
                                                        <DialogHeader>
                                                            <DialogTitle>Edit Service Pricing</DialogTitle>
                                                        </DialogHeader>
                                                        <ServicePricingForm
                                                            formData={formData}
                                                            setFormData={setFormData}
                                                            onSubmit={handleSubmit}
                                                            isLoading={updateMutation.isPending}
                                                            isEdit={true}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => deleteMutation.mutate(pricing.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="h-8 rounded-lg border-red-200 px-2 text-xs text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No service pricing configured yet.</p>
                        <Button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            className="h-10 rounded-lg bg-violet-500 px-6 text-sm font-bold text-white shadow-md hover:bg-violet-600"
                        >
                            {seedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Load Default Services (Urban Company Style)
                        </Button>
                    </div>
                )}
            </div>

            {/* Confirm Clear All Dialog */}
            <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" /> Clear All Pricing?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">
                        This will permanently delete all <strong>{pricingList?.length || 0}</strong> service pricing entries. This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setConfirmClearOpen(false)} className="h-9 rounded-lg px-5 text-sm">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => clearAllMutation.mutate()}
                            disabled={clearAllMutation.isPending}
                            className="h-9 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700"
                        >
                            {clearAllMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Yes, Delete All
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pricing Info */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">How Service Pricing Works</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Formula</h4>
                        <div className="p-3 bg-white rounded-lg border border-violet-200 font-mono text-sm">
                            Total = Base Price + (Rate/hr x (Hours - Min hrs))
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Example</h4>
                        <p className="text-sm text-gray-600">
                            For <strong>Home Deep Cleaning</strong> (4 hours):<br />
                            Base Price (Rs.1499) + (Rs.300/hr x 1hr) = <strong className="text-green-600">Rs.1799</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Form Component
function ServicePricingForm({
    formData,
    setFormData,
    onSubmit,
    isLoading,
    isEdit,
}: {
    formData: {
        serviceCategory: string;
        serviceName: string;
        serviceCode: string;
        description: string;
        basePrice: string;
        ratePerHour: string;
        minHours: string;
        estimatedDuration: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
    onSubmit: () => void;
    isLoading: boolean;
    isEdit: boolean;
}) {
    const standardCategories = SERVICE_CATEGORIES.filter(c => c !== "Custom");
    const [isCustom, setIsCustom] = useState(
        () => !!formData.serviceCategory && !SERVICE_CATEGORIES.includes(formData.serviceCategory)
    );

    return (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Service Category *</Label>
                    <Select
                        value={isCustom ? "Custom" : formData.serviceCategory}
                        onValueChange={(value) => {
                            if (value === "Custom") {
                                setIsCustom(true);
                                setFormData({ ...formData, serviceCategory: "" });
                            } else {
                                setIsCustom(false);
                                setFormData({ ...formData, serviceCategory: value });
                            }
                        }}
                    >
                        <SelectTrigger className="mt-1 h-10 rounded-lg">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {standardCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            <SelectItem value="Custom">
                                <span className="text-blue-600 font-semibold">+ Custom</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    {isCustom && (
                        <Input
                            value={formData.serviceCategory}
                            onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                            placeholder="Enter custom category name"
                            className="mt-2 h-10 rounded-lg border-blue-300 focus:ring-blue-400"
                            autoFocus
                        />
                    )}
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Service Code *</Label>
                    <Input
                        value={formData.serviceCode}
                        onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value.toUpperCase() })}
                        placeholder="e.g., CLN-001"
                        className="mt-1 h-10 rounded-lg font-mono"
                        disabled={isEdit}
                    />
                    <p className="text-xs text-gray-500 mt-1">Unique identifier for this service</p>
                </div>
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Service Name *</Label>
                <Input
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="e.g., Deep House Cleaning"
                    className="mt-1 h-10 rounded-lg"
                />
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Description</Label>
                <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the service..."
                    className="mt-1 rounded-lg resize-none"
                    rows={2}
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Base Price (Rs.) *</Label>
                    <Input
                        type="number"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        placeholder="1499"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                    />
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Rate/hr (Rs.) *</Label>
                    <Input
                        type="number"
                        value={formData.ratePerHour}
                        onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                        placeholder="300"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                    />
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Min hours</Label>
                    <Input
                        type="number"
                        value={formData.minHours}
                        onChange={(e) => setFormData({ ...formData, minHours: e.target.value })}
                        placeholder="1"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                        step={0.5}
                    />
                </div>
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Estimated Duration</Label>
                <Input
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    placeholder="e.g., 2-3 hours"
                    className="mt-1 h-10 rounded-lg"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="h-10 rounded-lg bg-black px-8 text-sm font-bold text-violet-400 shadow-md transition-all hover:opacity-85"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {isEdit ? "Update Service" : "Create Service"}
                </Button>
            </div>
        </div>
    );
}
