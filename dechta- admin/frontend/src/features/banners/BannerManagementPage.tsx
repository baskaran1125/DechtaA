import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Loader2, Plus, Pencil, Trash2, ImagePlus, CheckCircle2, X,
    Users, Truck, Store, HardHat,
} from "lucide-react";
import type { Banner } from "@/types";

interface BannerManagementPageProps {
    banners?: Banner[];
    bannersLoading?: boolean;
}

type BannerForm = {
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    targetPage: string;
    slidePosition: number;
    active: "true" | "false";
};

type DeleteContext = {
    id: number;
    page: string;
    mode: "delete" | "remove-page";
    remainingTargets?: string[];
};

const EMPTY_FORM: BannerForm = {
    title: "",
    subtitle: "",
    imageUrl: "",
    linkUrl: "",
    targetPage: "client",
    slidePosition: 1,
    active: "true",
};

const PAGE_OPTIONS = [
    { value: "client", label: "Client App", icon: Users, color: "bg-blue-500" },
    { value: "manpower", label: "Manpower App", icon: HardHat, color: "bg-violet-500" },
    { value: "vendor", label: "Vendor App", icon: Store, color: "bg-emerald-500" },
    { value: "driver", label: "Driver App", icon: Truck, color: "bg-orange-500" },
];

const SLIDE_POSITIONS = [1, 2, 3, 4];

export default function BannerManagementPage({ banners, bannersLoading }: BannerManagementPageProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteContext, setDeleteContext] = useState<DeleteContext | null>(null);
    const [activeTab, setActiveTab] = useState("client");

    const parseTargetPages = (targetPages: string | null | undefined) => {
        return (targetPages || "all")
            .split(",")
            .map((page) => page.trim())
            .filter(Boolean);
    };

    const createMutation = useMutation({
        mutationFn: async (data: typeof form) => {
            const payload = {
                title: data.title,
                subtitle: data.subtitle,
                imageUrl: data.imageUrl,
                linkUrl: data.linkUrl,
                targetPages: [data.targetPage],
                position: "hero",
                displayOrder: data.slidePosition,
                active: data.active,
            };
            const res = await fetch("/api/ops/banners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create banner");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Banner Created", description: "Your banner is now live." });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/banners"] });
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
            const payload = {
                title: data.title,
                subtitle: data.subtitle,
                imageUrl: data.imageUrl,
                linkUrl: data.linkUrl,
                targetPages: [data.targetPage],
                displayOrder: data.slidePosition,
                active: data.active,
            };
            const res = await fetch(`/api/ops/banners/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update banner");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Banner Updated", description: "Changes saved successfully." });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/banners"] });
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/ops/banners/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to delete banner");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Banner Deleted", description: "Banner removed successfully." });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/banners"] });
            setDeleteContext(null);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const removePageMutation = useMutation({
        mutationFn: async ({ id, targetPages }: { id: number; targetPages: string[] }) => {
            const res = await fetch(`/api/ops/banners/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ targetPages }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to remove banner from page");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Banner Updated", description: "Banner removed from this page." });
            queryClient.invalidateQueries({ queryKey: ["/api/ops/banners"] });
            setDeleteContext(null);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number; active: string }) => {
            const res = await fetch(`/api/ops/banners/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ active }),
            });
            if (!res.ok) throw new Error("Failed to toggle banner");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/banners"] });
        },
    });

    const resetForm = () => {
        setForm({ ...EMPTY_FORM, targetPage: activeTab });
        setEditingId(null);
        setDialogOpen(false);
    };

    const handleEdit = (banner: Banner) => {
        const targets = parseTargetPages(banner.targetPages);
        const targetPage = targets.find((page) => page !== "all") || activeTab;

        setForm({
            title: banner.title,
            subtitle: banner.subtitle || "",
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl || "",
            targetPage,
            slidePosition: banner.displayOrder || 1,
            active: banner.active as "true" | "false",
        });
        setEditingId(banner.id);
        setDialogOpen(true);
    };

    const handleDelete = (banner: Banner, page: string) => {
        const targets = parseTargetPages(banner.targetPages);

        if (targets.includes("all")) {
            const remainingTargets = PAGE_OPTIONS.map((option) => option.value).filter((value) => value !== page);
            setDeleteContext({
                id: banner.id,
                page,
                mode: "remove-page",
                remainingTargets,
            });
            return;
        }

        if (targets.length > 1) {
            const remainingTargets = targets.filter((target) => target !== page);
            setDeleteContext({
                id: banner.id,
                page,
                mode: "remove-page",
                remainingTargets,
            });
            return;
        }

        setDeleteContext({ id: banner.id, page, mode: "delete" });
    };

    const handleAddForSlot = (page: string, slot: number) => {
        setForm({ ...EMPTY_FORM, targetPage: page, slidePosition: slot });
        setEditingId(null);
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.imageUrl) {
            toast({ title: "Required Fields", description: "Please add a title and image.", variant: "destructive" });
            return;
        }
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const res = await fetch("/api/ops/upload", {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setForm((f) => ({ ...f, imageUrl: data.imageUrl }));
            toast({ title: "Uploaded", description: "Image ready to use." });
        } catch {
            toast({ title: "Upload Failed", description: "Could not upload image.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const isMutating = createMutation.isPending || updateMutation.isPending;

    // Get banner for specific page and slot
    const getBannerForSlot = (page: string, slot: number) => {
        const slotBanners = (banners || []).filter((banner) => banner.displayOrder === slot);
        const exactMatch = slotBanners.find((banner) => parseTargetPages(banner.targetPages).includes(page));
        if (exactMatch) return exactMatch;
        return slotBanners.find((banner) => parseTargetPages(banner.targetPages).includes("all"));
    };

    // Count active banners per page
    const getActiveCountForPage = (page: string) => {
        return SLIDE_POSITIONS.reduce((count, slot) => {
            const banner = getBannerForSlot(page, slot);
            return banner?.active === "true" ? count + 1 : count;
        }, 0);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Banner Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage promotional banners for each app (4 slides per app)
                    </p>
                </div>
            </div>

            {/* Loading State */}
            {bannersLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    {/* Tab List */}
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                        {PAGE_OPTIONS.map((page) => {
                            const PageIcon = page.icon;
                            const activeCount = getActiveCountForPage(page.value);
                            return (
                                <TabsTrigger
                                    key={page.value}
                                    value={page.value}
                                    className="flex items-center gap-2 data-[state=active]:bg-white"
                                >
                                    <PageIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{page.label.replace(" App", "")}</span>
                                    {activeCount > 0 && (
                                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                            {activeCount}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {/* Tab Contents */}
                    {PAGE_OPTIONS.map((page) => {
                        const PageIcon = page.icon;
                        return (
                            <TabsContent key={page.value} value={page.value} className="space-y-4">
                                {/* Page Header */}
                                <Card className="border-none shadow-none bg-gradient-to-r from-gray-50 to-white">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${page.color} text-white shadow-sm`}>
                                                <PageIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{page.label} Banners</CardTitle>
                                                <p className="text-sm text-gray-500">
                                                    {getActiveCountForPage(page.value)} of 4 slots active
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>

                                {/* Banner Slots Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {SLIDE_POSITIONS.map((slot) => {
                                        const banner = getBannerForSlot(page.value, slot);

                                        if (banner) {
                                            // Filled Slot
                                            return (
                                                <Card
                                                    key={slot}
                                                    className={`overflow-hidden transition-all hover:shadow-md ${
                                                        banner.active === "false" ? "opacity-60" : ""
                                                    }`}
                                                >
                                                    <div className="relative">
                                                        {/* Slot Label */}
                                                        <div className="absolute top-2 left-2 z-10">
                                                            <Badge className="bg-black/70 text-white hover:bg-black/80">
                                                                Slide {slot}
                                                            </Badge>
                                                        </div>
                                                        {/* Status Badge */}
                                                        <div className="absolute top-2 right-2 z-10">
                                                            <Badge
                                                                className={
                                                                    banner.active === "true"
                                                                        ? "bg-green-500 hover:bg-green-600 text-white"
                                                                        : "bg-gray-500 hover:bg-gray-600 text-white"
                                                                }
                                                            >
                                                                {banner.active === "true" ? "Live" : "Off"}
                                                            </Badge>
                                                        </div>
                                                        {/* Banner Image */}
                                                        <div className="h-36 bg-gray-100">
                                                            <img
                                                                src={banner.imageUrl}
                                                                alt={banner.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-4">
                                                        <h3 className="font-semibold text-gray-900 truncate">{banner.title}</h3>
                                                        {banner.subtitle && (
                                                            <p className="text-sm text-gray-500 truncate mt-0.5">{banner.subtitle}</p>
                                                        )}
                                                        {/* Actions */}
                                                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                                            <div className="flex items-center gap-2">
                                                                <Switch
                                                                    checked={banner.active === "true"}
                                                                    onCheckedChange={(checked) =>
                                                                        toggleActiveMutation.mutate({
                                                                            id: banner.id,
                                                                            active: checked ? "true" : "false",
                                                                        })
                                                                    }
                                                                />
                                                                <span className="text-xs text-gray-500">
                                                                    {banner.active === "true" ? "Active" : "Inactive"}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => handleEdit(banner)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDelete(banner, page.value)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        } else {
                                            // Empty Slot
                                            return (
                                                <Card
                                                    key={slot}
                                                    className="border-dashed border-2 hover:border-cyan-400 hover:bg-cyan-50/30 transition-colors cursor-pointer"
                                                    onClick={() => handleAddForSlot(page.value, slot)}
                                                >
                                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                                        <Badge variant="outline" className="mb-3">
                                                            Slide {slot}
                                                        </Badge>
                                                        <div className="bg-gray-100 rounded-full p-3 mb-3">
                                                            <Plus className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-600">Add Banner</p>
                                                        <p className="text-xs text-gray-400 mt-1">Click to create</p>
                                                    </CardContent>
                                                </Card>
                                            );
                                        }
                                    })}
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
                <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-lg">{editingId ? "Edit Banner" : "Create Banner"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 flex-1">
                        {/* Image Upload */}
                        <div>
                            <Label className="text-xs font-medium">Banner Image *</Label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`mt-1 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                    form.imageUrl
                                        ? "border-cyan-300 bg-cyan-50/50"
                                        : "border-gray-200 hover:border-cyan-400 hover:bg-gray-50"
                                }`}
                            >
                                {form.imageUrl ? (
                                    <div className="relative">
                                        <img
                                            src={form.imageUrl}
                                            alt="Preview"
                                            className="w-full h-24 object-cover rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-1 right-1 h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setForm((f) => ({ ...f, imageUrl: "" }));
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-5">
                                        {uploading ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                                        ) : (
                                            <>
                                                <ImagePlus className="h-8 w-8 text-gray-400 mb-1" />
                                                <p className="text-xs text-gray-500">Click to upload</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Title */}
                        <div>
                            <Label htmlFor="title" className="text-xs font-medium">Title *</Label>
                            <Input
                                id="title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g., Summer Sale - 50% Off"
                                className="mt-1 h-9"
                                required
                            />
                        </div>

                        {/* Subtitle */}
                        <div>
                            <Label htmlFor="subtitle" className="text-xs font-medium">
                                Subtitle <span className="text-gray-400 font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="subtitle"
                                value={form.subtitle}
                                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                                placeholder="e.g., Limited time offer"
                                className="mt-1 h-9"
                            />
                        </div>

                        {/* Link URL */}
                        <div>
                            <Label htmlFor="linkUrl" className="text-xs font-medium">
                                Link URL <span className="text-gray-400 font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="linkUrl"
                                value={form.linkUrl}
                                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                                placeholder="https://example.com/promo"
                                className="mt-1 h-9"
                            />
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                            <div>
                                <p className="text-xs font-medium text-gray-900">Publish immediately</p>
                                <p className="text-[11px] text-gray-500">Visible in the app</p>
                            </div>
                            <Switch
                                checked={form.active === "true"}
                                onCheckedChange={(c) => setForm({ ...form, active: c ? "true" : "false" })}
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex gap-2 pt-1">
                            <Button
                                type="submit"
                                className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-9"
                                disabled={isMutating}
                            >
                                {isMutating ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                {editingId ? "Save" : "Create"}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm} className="h-9">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteContext !== null} onOpenChange={() => setDeleteContext(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteContext?.mode === "remove-page" ? "Remove Banner From This Page?" : "Delete Banner?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteContext?.mode === "remove-page"
                                ? `This removes the slide from the ${deleteContext.page} page only.`
                                : "This action cannot be undone. The banner will be permanently removed."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (!deleteContext) return;

                                if (deleteContext.mode === "remove-page") {
                                    removePageMutation.mutate({
                                        id: deleteContext.id,
                                        targetPages: deleteContext.remainingTargets || [],
                                    });
                                    return;
                                }

                                deleteMutation.mutate(deleteContext.id);
                            }}
                        >
                            {deleteMutation.isPending || removePageMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                deleteContext?.mode === "remove-page" ? "Remove" : "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
