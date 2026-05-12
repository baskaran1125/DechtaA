import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsPageProps {
    user: { id?: number; name?: string; email?: string; role?: string } | null | undefined;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export default function SettingsPage({ user, theme, onToggleTheme }: SettingsPageProps) {
    const { toast } = useToast();

    // Commission settings
    const { data: commission, isLoading: commissionLoading } = useQuery<{ vendorCommission: string; manpowerCommission: string; driverCommission: string }>({
        queryKey: ["/api/ops/settings/commission"],
    });

    const [vendorRate, setVendorRate] = useState("");
    const [manpowerRate, setManpowerRate] = useState("");
    const [driverRate, setDriverRate] = useState("");

    useEffect(() => {
        if (commission) {
            setVendorRate(commission.vendorCommission);
            setManpowerRate(commission.manpowerCommission);
            setDriverRate(commission.driverCommission);
        }
    }, [commission]);

    const commissionMutation = useMutation({
        mutationFn: async (data: { vendorCommission: string; manpowerCommission: string; driverCommission: string }) => {
            const res = await fetch("/api/ops/settings/commission", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/ops/settings/commission"] });
            toast({ title: "Commission Updated", description: "Global commission rates have been saved." });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handleCommissionSave = () => {
        const vc = parseFloat(vendorRate);
        const mc = parseFloat(manpowerRate);
        const dc = parseFloat(driverRate);
        if (isNaN(vc) || vc < 0 || vc > 100 || isNaN(mc) || mc < 0 || mc > 100 || isNaN(dc) || dc < 0 || dc > 100) {
            toast({ title: "Invalid Rate", description: "Enter a number between 0 and 100.", variant: "destructive" });
            return;
        }
        commissionMutation.mutate({ vendorCommission: vendorRate, manpowerCommission: manpowerRate, driverCommission: driverRate });
    };
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Settings & Configuration</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage admin access and system settings</p>
                </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Theme Settings</h3>
                        <p className="text-sm text-gray-500 mt-1">Switch between light and dark theme</p>
                    </div>
                    <Button
                        onClick={onToggleTheme}
                        className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85"
                    >
                        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </Button>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        Current theme: <span className="font-bold capitalize">{theme}</span>
                    </p>
                </div>
            </div>

            {/* Commission Management */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                        <Percent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Commission Management</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Set fixed commission rates for all vendors, manpower and drivers</p>
                    </div>
                </div>

                {commissionLoading ? (
                    <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-500 mx-auto" /></div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid sm:grid-cols-3 gap-6">
                            <div className="p-5 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                                <Label className="mb-2 block text-sm font-bold text-gray-700">Vendor Commission Rate (%)</Label>
                                <p className="text-xs text-gray-500 mb-3">Applied to all vendor transactions</p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={vendorRate}
                                        onChange={(e) => setVendorRate(e.target.value)}
                                        className="h-11 rounded-lg border-cyan-300 text-lg font-bold text-center"
                                        min={0} max={100} step={0.1}
                                        placeholder="0"
                                    />
                                    <span className="text-lg font-bold text-gray-500">%</span>
                                </div>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                                <Label className="mb-2 block text-sm font-bold text-gray-700">Manpower Commission Rate (%)</Label>
                                <p className="text-xs text-gray-500 mb-3">Applied to all manpower transactions</p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={manpowerRate}
                                        onChange={(e) => setManpowerRate(e.target.value)}
                                        className="h-11 rounded-lg border-orange-300 text-lg font-bold text-center"
                                        min={0} max={100} step={0.1}
                                        placeholder="0"
                                    />
                                    <span className="text-lg font-bold text-gray-500">%</span>
                                </div>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                <Label className="mb-2 block text-sm font-bold text-gray-700">Driver Commission Rate (%)</Label>
                                <p className="text-xs text-gray-500 mb-3">Applied to all driver transactions</p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={driverRate}
                                        onChange={(e) => setDriverRate(e.target.value)}
                                        className="h-11 rounded-lg border-green-300 text-lg font-bold text-center"
                                        min={0} max={100} step={0.1}
                                        placeholder="0"
                                    />
                                    <span className="text-lg font-bold text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleCommissionSave}
                                disabled={commissionMutation.isPending}
                                className="h-10 rounded-lg bg-black px-8 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85"
                            >
                                {commissionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Commission Rates
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Admin Management */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Admin Management</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage system administrators and their access</p>
                    </div>
                    <Button className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85">
                        + Add Admin
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-cyan-400 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-gray-900">{user?.name || 'Admin'}</h4>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase">
                                    Super Admin
                                </span>
                            </div>
                            <Button variant="outline" className="h-9 rounded-lg border-gray-300 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50">
                                Edit
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg hover:border-cyan-400 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-gray-900">Vendor Admin</h4>
                                <p className="text-sm text-gray-500">vendor.admin@example.com</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full uppercase">
                                    Vendor Admin
                                </span>
                            </div>
                            <Button variant="outline" className="h-9 rounded-lg border-red-300 px-4 text-sm font-medium text-red-600 hover:bg-red-50">
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Configuration */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">System Configuration</h3>

                <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                            <Label className="mb-2 block text-sm font-semibold text-gray-700">Database Version</Label>
                            <div className="px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 text-sm">
                                PostgreSQL 14.x
                            </div>
                        </div>
                        <div>
                            <Label className="mb-2 block text-sm font-semibold text-gray-700">API Version</Label>
                            <div className="px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 text-sm">
                                v1.0.0
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block text-sm font-semibold text-gray-700">Application Name</Label>
                        <Input type="text" defaultValue="DECHTA" className="h-10 rounded-lg border-gray-300 text-sm" />
                    </div>

                    <div>
                        <Label className="mb-2 block text-sm font-semibold text-gray-700">Admin Portal URL</Label>
                        <Input type="text" defaultValue="http://localhost:5175" className="h-10 rounded-lg border-gray-300 text-sm" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button variant="outline" className="h-10 rounded-lg border-gray-300 px-6 text-sm font-bold text-gray-600 hover:bg-gray-50">
                            Cancel
                        </Button>
                        <Button className="h-10 rounded-lg bg-black px-6 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85">
                            Save Settings
                        </Button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-2xl border-2 border-red-200 shadow-lg p-6">
                <h3 className="text-lg font-bold text-red-700 mb-4">Danger Zone</h3>
                <p className="text-sm text-red-600 mb-6">Irreversible actions that cannot be undone</p>
                <div className="flex gap-4">
                    <Button variant="outline" className="h-10 rounded-lg border-red-300 px-6 text-sm font-bold text-red-600 hover:bg-red-100">
                        🔄 Reset Database
                    </Button>
                    <Button variant="outline" className="h-10 rounded-lg border-red-300 px-6 text-sm font-bold text-red-600 hover:bg-red-100">
                        🗑️ Clear All Logs
                    </Button>
                </div>
            </div>
        </div>
    );
}
