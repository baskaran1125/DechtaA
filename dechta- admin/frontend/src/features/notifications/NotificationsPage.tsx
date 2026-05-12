import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2, Plus, Bell, Send, Clock, Trash2, Calendar, Users,
    Smartphone, Store, Truck, HardHat, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/types";
import { format } from "date-fns";

const TARGET_APPS = [
    { value: "all", label: "All Apps", icon: Smartphone, color: "bg-gray-500" },
    { value: "client", label: "Client App", icon: Users, color: "bg-blue-500" },
    { value: "vendor", label: "Vendor App", icon: Store, color: "bg-emerald-500" },
    { value: "driver", label: "Driver App", icon: Truck, color: "bg-orange-500" },
    { value: "manpower", label: "Manpower App", icon: HardHat, color: "bg-violet-500" },
];

const NOTIFICATION_TYPES = [
    { value: "info", label: "Info", color: "bg-blue-100 text-blue-700" },
    { value: "promo", label: "Promo", color: "bg-green-100 text-green-700" },
    { value: "alert", label: "Alert", color: "bg-red-100 text-red-700" },
    { value: "update", label: "Update", color: "bg-purple-100 text-purple-700" },
];

const STATUS_STYLES: Record<string, { color: string; icon: typeof CheckCircle }> = {
    draft: { color: "bg-gray-100 text-gray-700", icon: Clock },
    scheduled: { color: "bg-yellow-100 text-yellow-700", icon: Calendar },
    sent: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    cancelled: { color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function NotificationsPage() {
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        targetApp: "all",
        type: "info",
        imageUrl: "",
        linkUrl: "",
    });

    // Fetch notifications
    const { data: notifications, isLoading } = useQuery<Notification[]>({
        queryKey: ["/api/ops/notifications"],
        refetchInterval: 10000,
    });

    const { data: notificationStats } = useQuery<{ total: number; draft: number; scheduled: number; sent: number; cancelled: number }>({
        queryKey: ["/api/ops/notifications/stats"],
        refetchInterval: 10000,
    });

    // Create notification
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/ops/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...data, status: "draft" }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create notification");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/notifications"] });
            toast({ title: "Success", description: "Notification created as draft." });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Send notification
    const sendMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/ops/notifications/${id}/send`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to send notification");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/notifications"] });
            toast({ title: "Sent!", description: "Notification sent successfully." });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Delete notification
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/ops/notifications/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to delete notification");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/notifications"] });
            toast({ title: "Deleted", description: "Notification deleted successfully." });
            setDeleteId(null);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Cancel notification
    const cancelMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/ops/notifications/${id}/cancel`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to cancel notification");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/notifications"] });
            toast({ title: "Cancelled", description: "Notification cancelled." });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const resetForm = () => {
        setFormData({
            title: "",
            message: "",
            targetApp: "all",
            type: "info",
            imageUrl: "",
            linkUrl: "",
        });
    };

    // Filter notifications
    const filteredNotifications = notifications?.filter(n =>
        statusFilter === "all" || n.status === statusFilter
    ) || [];

    // Stats
    const stats = notificationStats || {
        total: notifications?.length || 0,
        draft: notifications?.filter(n => n.status === "draft").length || 0,
        scheduled: notifications?.filter(n => n.status === "scheduled").length || 0,
        sent: notifications?.filter(n => n.status === "sent").length || 0,
        cancelled: notifications?.filter(n => n.status === "cancelled").length || 0,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Notification Center</h2>
                    <p className="text-sm text-gray-500 mt-1">Send notifications to users across all apps</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={resetForm}
                            className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-amber-400 shadow-md transition-all hover:opacity-85"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create Notification
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Notification</DialogTitle>
                        </DialogHeader>
                        <NotificationForm
                            formData={formData}
                            setFormData={setFormData}
                            onSubmit={() => createMutation.mutate(formData)}
                            isLoading={createMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total", value: stats.total, color: "from-gray-400 to-gray-600", icon: Bell },
                    { label: "Drafts", value: stats.draft, color: "from-blue-400 to-blue-600", icon: Clock },
                    { label: "Scheduled", value: stats.scheduled, color: "from-yellow-400 to-orange-500", icon: Calendar },
                    { label: "Sent", value: stats.sent, color: "from-green-400 to-emerald-600", icon: CheckCircle },
                ].map((stat) => (
                    <Card key={stat.label} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
                {["all", "draft", "scheduled", "sent", "cancelled"].map(status => (
                    <Badge
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-1.5 capitalize ${statusFilter === status ? "bg-amber-500" : ""}`}
                        onClick={() => setStatusFilter(status)}
                    >
                        {status}
                    </Badge>
                ))}
            </div>

            {/* Notifications Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">All Notifications</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Manage and send notifications</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" /></div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNotifications.map((notification) => {
                                    const targetApp = TARGET_APPS.find(t => t.value === notification.targetApp);
                                    const notifType = NOTIFICATION_TYPES.find(t => t.value === notification.type);
                                    const statusStyle = STATUS_STYLES[notification.status];
                                    const StatusIcon = statusStyle?.icon || AlertCircle;

                                    return (
                                        <TableRow key={notification.id}>
                                            <TableCell>
                                                <div className="max-w-[250px]">
                                                    <p className="font-semibold truncate">{notification.title}</p>
                                                    <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {targetApp && (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded ${targetApp.color} flex items-center justify-center`}>
                                                            <targetApp.icon className="w-3 h-3 text-white" />
                                                        </div>
                                                        <span className="text-sm">{targetApp.label}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={notifType?.color}>{notifType?.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusStyle?.color} inline-flex items-center gap-1`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {notification.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {notification.createdAt && format(new Date(notification.createdAt), "MMM d, h:mm a")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {notification.status === "draft" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => sendMutation.mutate(notification.id)}
                                                            disabled={sendMutation.isPending}
                                                            className="h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white"
                                                        >
                                                            <Send className="w-3 h-3 mr-1" /> Send
                                                        </Button>
                                                    )}
                                                    {(notification.status === "draft" || notification.status === "scheduled") && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => cancelMutation.mutate(notification.id)}
                                                            disabled={cancelMutation.isPending}
                                                            className="h-8 rounded-lg border-gray-300"
                                                        >
                                                            <XCircle className="w-3 h-3 mr-1" /> Cancel
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeleteId(notification.id)}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No notifications yet.</p>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="h-10 rounded-lg bg-amber-500 px-6 text-sm font-bold text-white shadow-md hover:bg-amber-600"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create Your First Notification
                        </Button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The notification will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Form Component
function NotificationForm({
    formData,
    setFormData,
    onSubmit,
    isLoading,
}: {
    formData: {
        title: string;
        message: string;
        targetApp: string;
        type: string;
        imageUrl: string;
        linkUrl: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
    onSubmit: () => void;
    isLoading: boolean;
}) {
    return (
        <div className="space-y-4 py-4">
            <div>
                <Label className="text-sm font-semibold text-gray-700">Title *</Label>
                <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 20% Off on All Services!"
                    className="mt-1 h-10 rounded-lg"
                />
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Message *</Label>
                <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your notification message..."
                    className="mt-1 rounded-lg resize-none"
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Target App *</Label>
                    <Select
                        value={formData.targetApp}
                        onValueChange={(value) => setFormData({ ...formData, targetApp: value })}
                    >
                        <SelectTrigger className="mt-1 h-10 rounded-lg">
                            <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                            {TARGET_APPS.map(app => (
                                <SelectItem key={app.value} value={app.value}>
                                    <div className="flex items-center gap-2">
                                        <app.icon className="w-4 h-4" />
                                        {app.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-sm font-semibold text-gray-700">Type</Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                        <SelectTrigger className="mt-1 h-10 rounded-lg">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {NOTIFICATION_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Image URL (optional)</Label>
                <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1 h-10 rounded-lg"
                />
            </div>

            <div>
                <Label className="text-sm font-semibold text-gray-700">Link URL (optional)</Label>
                <Input
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="https://example.com/promo"
                    className="mt-1 h-10 rounded-lg"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    onClick={onSubmit}
                    disabled={isLoading || !formData.title || !formData.message}
                    className="h-10 rounded-lg bg-black px-8 text-sm font-bold text-amber-400 shadow-md transition-all hover:opacity-85"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save as Draft
                </Button>
            </div>
        </div>
    );
}
