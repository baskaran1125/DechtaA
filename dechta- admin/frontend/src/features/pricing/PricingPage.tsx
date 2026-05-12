import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Plus, Pencil, Truck, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VehiclePricing } from "@/types";

export default function PricingPage() {
    const { toast } = useToast();
    const [editingPricing, setEditingPricing] = useState<VehiclePricing | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        vehicleType: "",
        displayName: "",
        baseFare: "",
        ratePerKm: "",
        minKm: "0",
    });

    // Fetch pricing data
    const { data: pricingList, isLoading } = useQuery<VehiclePricing[]>({
        queryKey: ["/api/ops/pricing"],
    });

    // Create pricing
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/ops/pricing", {
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
            queryClient.invalidateQueries({ queryKey: ["/api/ops/pricing"] });
            toast({ title: "Success", description: "Vehicle pricing created successfully." });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Update pricing
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData & { isActive: boolean }> }) => {
            const res = await fetch(`/api/ops/pricing/${id}`, {
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
            queryClient.invalidateQueries({ queryKey: ["/api/ops/pricing"] });
            toast({ title: "Success", description: "Vehicle pricing updated successfully." });
            setEditingPricing(null);
            resetForm();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Seed default pricing
    const seedMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/ops/pricing/seed", {
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
            queryClient.invalidateQueries({ queryKey: ["/api/ops/pricing"] });
            toast({ title: "Success", description: data.message });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const resetForm = () => {
        setFormData({
            vehicleType: "",
            displayName: "",
            baseFare: "",
            ratePerKm: "",
            minKm: "0",
        });
    };

    const handleEdit = (pricing: VehiclePricing) => {
        setEditingPricing(pricing);
        setFormData({
            vehicleType: pricing.vehicleType,
            displayName: pricing.displayName,
            baseFare: pricing.baseFare,
            ratePerKm: pricing.ratePerKm,
            minKm: pricing.minKm || "0",
        });
    };

    const handleSubmit = () => {
        if (!formData.vehicleType || !formData.displayName || !formData.baseFare || !formData.ratePerKm) {
            toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
            return;
        }

        if (editingPricing) {
            updateMutation.mutate({ id: editingPricing.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleToggleActive = (pricing: VehiclePricing) => {
        updateMutation.mutate({ id: pricing.id, data: { isActive: !pricing.isActive } });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Vehicle Pricing Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Set delivery charges per kilometer for each vehicle type</p>
                </div>
                <div className="flex gap-3">
                    {(!pricingList || pricingList.length === 0) && (
                        <Button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            variant="outline"
                            className="h-10 rounded-lg border-cyan-300 px-6 text-sm font-bold text-cyan-600 hover:bg-cyan-50"
                        >
                            {seedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Seed Default Pricing
                        </Button>
                    )}
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setEditingPricing(null);
                                }}
                                className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Vehicle Type
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Vehicle Pricing</DialogTitle>
                            </DialogHeader>
                            <PricingForm
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

            {/* Pricing Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Vehicle Types & Rates</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Manage pricing for all vehicle categories</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-500 mx-auto" /></div>
                ) : pricingList && pricingList.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vehicle Type</TableHead>
                                    <TableHead>Display Name</TableHead>
                                    <TableHead className="text-right">Base Fare</TableHead>
                                    <TableHead className="text-right">Rate/km</TableHead>
                                    <TableHead className="text-right">Min km</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pricingList.map((pricing) => (
                                    <TableRow key={pricing.id}>
                                        <TableCell className="font-mono font-bold text-cyan-700">{pricing.vehicleType}</TableCell>
                                        <TableCell className="font-semibold">{pricing.displayName}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            <span className="inline-flex items-center"><IndianRupee className="w-3 h-3" />{pricing.baseFare}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">
                                            <span className="inline-flex items-center"><IndianRupee className="w-3 h-3" />{pricing.ratePerKm}/km</span>
                                        </TableCell>
                                        <TableCell className="text-right text-gray-600">{pricing.minKm || 0} km</TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={pricing.isActive}
                                                onCheckedChange={() => handleToggleActive(pricing)}
                                                disabled={updateMutation.isPending}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
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
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Vehicle Pricing</DialogTitle>
                                                    </DialogHeader>
                                                    <PricingForm
                                                        formData={formData}
                                                        setFormData={setFormData}
                                                        onSubmit={handleSubmit}
                                                        isLoading={updateMutation.isPending}
                                                        isEdit={true}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No vehicle pricing configured yet.</p>
                        <Button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            className="h-10 rounded-lg bg-cyan-500 px-6 text-sm font-bold text-white shadow-md hover:bg-cyan-600"
                        >
                            {seedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Add Default Vehicle Types
                        </Button>
                    </div>
                )}
            </div>

            {/* Pricing Info */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">How Pricing Works</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Formula</h4>
                        <div className="p-3 bg-white rounded-lg border border-cyan-200 font-mono text-sm">
                            Total = Base Fare + (Rate/km x (Distance - Min km))
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Example</h4>
                        <p className="text-sm text-gray-600">
                            For a <strong>4W-1.2ton</strong> vehicle traveling <strong>15 km</strong>:<br />
                            Base Fare (Rs.200) + (Rs.14/km x 12km) = <strong className="text-green-600">Rs.368</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Form Component
function PricingForm({
    formData,
    setFormData,
    onSubmit,
    isLoading,
    isEdit,
}: {
    formData: { vehicleType: string; displayName: string; baseFare: string; ratePerKm: string; minKm: string };
    setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
    onSubmit: () => void;
    isLoading: boolean;
    isEdit: boolean;
}) {
    return (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Vehicle Type Code *</Label>
                    <Input
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        placeholder="e.g., 4W-1.5ton"
                        className="mt-1 h-10 rounded-lg"
                        disabled={isEdit}
                    />
                    <p className="text-xs text-gray-500 mt-1">Unique identifier (cannot change later)</p>
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Display Name *</Label>
                    <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="e.g., 4 Wheeler - 1.5 Ton"
                        className="mt-1 h-10 rounded-lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Base Fare (Rs.) *</Label>
                    <Input
                        type="number"
                        value={formData.baseFare}
                        onChange={(e) => setFormData({ ...formData, baseFare: e.target.value })}
                        placeholder="200"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                    />
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Rate per km (Rs.) *</Label>
                    <Input
                        type="number"
                        value={formData.ratePerKm}
                        onChange={(e) => setFormData({ ...formData, ratePerKm: e.target.value })}
                        placeholder="14"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                        step={0.5}
                    />
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Min km (included)</Label>
                    <Input
                        type="number"
                        value={formData.minKm}
                        onChange={(e) => setFormData({ ...formData, minKm: e.target.value })}
                        placeholder="3"
                        className="mt-1 h-10 rounded-lg"
                        min={0}
                    />
                    <p className="text-xs text-gray-500 mt-1">km included in base fare</p>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="h-10 rounded-lg bg-black px-8 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {isEdit ? "Update Pricing" : "Create Pricing"}
                </Button>
            </div>
        </div>
    );
}
