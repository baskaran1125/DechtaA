import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { exportToCsv } from "@/utils/exportCsv";
import type { Job, OpsOrder } from "@/types";

interface JobsPageProps {
    jobs: Job[] | undefined;
    jobsLoading: boolean;
    orders?: OpsOrder[] | undefined;
    ordersLoading?: boolean;
    filter?: 'all' | 'active' | 'missing' | 'completed' | 'pending' | 'assigned';
}

export default function JobsPage({ jobs, jobsLoading, orders, ordersLoading, filter = 'all' }: JobsPageProps) {
    const [viewMode, setViewMode] = useState<'service' | 'product'>('service');

    const filteredJobs = (jobs ?? []).filter((job) => {
        if (filter === 'active') {
            return (job.jobType === 'manpower' || !!job.assignedWorkerId) && job.status === 'in-progress';
        }
        if (filter === 'missing') {
            return (job.jobType === 'manpower' || job.assignedWorkerId === null) && job.status === 'pending';
        }
        if (filter === 'completed') {
            return (job.jobType === 'manpower' || !!job.assignedWorkerId) && job.status === 'completed';
        }
        if (filter === 'pending') {
            return job.status === 'pending';
        }
        if (filter === 'assigned') {
            return job.status === 'in-progress' && !!job.assignedWorkerId;
        }
        return true;
    });

    const filteredOrders = (orders ?? []).filter((order) => {
        if (filter === 'active') {
            return order.status === 'dispatched';
        }
        if (filter === 'missing') {
            return order.assignedDriverId === null && (order.status === 'pending' || order.status === 'ordered');
        }
        if (filter === 'completed') {
            return order.status === 'delivered' || order.status === 'completed';
        }
        if (filter === 'pending') {
            return order.status === 'pending' || order.status === 'ordered';
        }
        if (filter === 'assigned') {
            return order.status === 'dispatched' || order.status === 'delivered' || !!order.assignedDriverId;
        }
        return true;
    });

    const handleExport = () => {
        if (viewMode === 'service') {
            exportToCsv(filteredJobs, [
                { key: 'title', header: 'Job Title' },
                { key: 'client.name', header: 'Client' },
                { key: 'client.phone', header: 'Contact' },
                { key: 'assignedWorkerId', header: 'Assigned Worker' },
                { key: 'status', header: 'Status' }
            ], 'service_jobs_export');
        } else {
            exportToCsv(filteredOrders, [
                { key: 'buyer.name', header: 'Client' },
                { key: 'buyer.phone', header: 'Contact' },
                { key: 'vendor.name', header: 'Assigned Vendor' },
                { key: 'driver.name', header: 'Driver' },
                { key: 'status', header: 'Status' }
            ], 'product_orders_export');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Jobs Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage ongoing services and product deliveries</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('service')}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${viewMode === 'service' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Service
                        </button>
                        <button
                            onClick={() => setViewMode('product')}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${viewMode === 'product' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    {viewMode === 'service' ? (
                        <Table className="w-full text-sm">
                            <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <TableRow>
                                    <TableHead className="px-6 py-3 text-left font-semibold w-16">S.No</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Client</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Contact</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Job Title</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Assigned Worker</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100">
                                {jobsLoading ? (
                                    <TableRow><TableCell colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                ) : filteredJobs.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No services found</TableCell></TableRow>
                                ) : (
                                    filteredJobs.map((job, index) => (
                                        <TableRow key={job.id} className="hover:bg-cyan-50/30 transition-colors">
                                            <TableCell className="px-6 py-4 text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="px-6 py-4 font-medium text-gray-900">{job.client.name}</TableCell>
                                            <TableCell className="px-6 py-4 text-gray-600">{job.client.phone || job.client.email}</TableCell>
                                            <TableCell className="px-6 py-4 font-medium text-gray-900">{job.title}</TableCell>
                                            <TableCell className="px-6 py-4 text-gray-600">{job.assignedWorkerId ? job.assignedWorkerId.slice(0, 8) + '...' : 'Unassigned'}</TableCell>
                                            <TableCell className="px-6 py-4">
                                                <StatusBadge
                                                    label={job.status}
                                                    colorClass={
                                                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        (job.status === 'in-progress' || job.status === 'ongoing') ? 'bg-blue-100 text-blue-700' :
                                                        job.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table className="w-full text-sm">
                            <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <TableRow>
                                    <TableHead className="px-6 py-3 text-left font-semibold w-16">S.No</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Client</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Contact</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Assigned Vendor</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Driver</TableHead>
                                    <TableHead className="px-6 py-3 text-left font-semibold">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100">
                                {ordersLoading ? (
                                    <TableRow><TableCell colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                ) : filteredOrders.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No products found</TableCell></TableRow>
                                ) : (
                                    filteredOrders.map((order, index) => (
                                        <TableRow key={order.id} className="hover:bg-cyan-50/30 transition-colors">
                                            <TableCell className="px-6 py-4 text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="px-6 py-4 font-medium text-gray-900">{order.buyer.name}</TableCell>
                                            <TableCell className="px-6 py-4 text-gray-600">{order.buyer.phone || order.buyer.email}</TableCell>
                                            <TableCell className="px-6 py-4 text-gray-600">{order.vendor?.name || 'Unknown'}</TableCell>
                                            <TableCell className="px-6 py-4 text-gray-600">{order.driver?.name || 'Unassigned'}</TableCell>
                                            <TableCell className="px-6 py-4">
                                                <StatusBadge
                                                    label={order.status}
                                                    colorClass={
                                                        order.status === 'delivered' || order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
