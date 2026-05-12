import { Loader2, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import type { StatsData } from "@/types";

interface RecentActivityProps {
    stats: StatsData | undefined;
    statsLoading: boolean;
}

export default function RecentActivity({ stats, statsLoading }: RecentActivityProps) {
    return (
        <section>
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-gray-600" />
                    </div>
                    Recent Activity
                </h2>
                <p className="text-sm text-gray-600 mt-1">Latest users and orders</p>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
                <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">Recent Users</h3>
                        <p className="text-xs text-gray-500 mt-1">Latest registered users</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="w-full text-sm">
                            <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <TableRow>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Name</TableHead>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Email</TableHead>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100">
                                {statsLoading ? (
                                    <TableRow><TableCell colSpan={3} className="px-4 py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
                                    stats.recentUsers.map((u: any) => (
                                        <TableRow key={u.id} className="hover:bg-cyan-50/30 transition-colors">
                                            <TableCell className="px-4 py-3 font-medium text-gray-900">{u.name}</TableCell>
                                            <TableCell className="px-4 py-3 text-gray-600">{u.email}</TableCell>
                                            <TableCell className="px-4 py-3">
                                                <StatusBadge
                                                    label={u.role}
                                                    colorClass={
                                                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                        u.role === 'vendor' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (<TableRow><TableCell colSpan={3} className="px-4 py-6 text-center text-gray-500 italic">No users found</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">Recent Orders</h3>
                        <p className="text-xs text-gray-500 mt-1">Latest buyer orders</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="w-full text-sm">
                            <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <TableRow>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Buyer</TableHead>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Product</TableHead>
                                    <TableHead className="px-4 py-2 text-left font-semibold">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100">
                                {statsLoading ? (
                                    <TableRow><TableCell colSpan={3} className="px-4 py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
                                    stats.recentOrders.map((o: any) => (
                                        <TableRow key={o.id} className="hover:bg-cyan-50/30 transition-colors">
                                            <TableCell className="px-4 py-3 font-medium text-gray-900">{o.buyer.name}</TableCell>
                                            <TableCell className="px-4 py-3 text-gray-600">{o.product.name}</TableCell>
                                            <TableCell className="px-4 py-3">
                                                <StatusBadge
                                                    label={o.status}
                                                    colorClass={
                                                        o.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (<TableRow><TableCell colSpan={3} className="px-4 py-6 text-center text-gray-500 italic">No orders found</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </section>
    );
}
