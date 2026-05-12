import { Users, ShoppingCart, Package, Hammer, Briefcase, Wrench, TrendingUp, Calendar } from "lucide-react";
import { StatCard, MiniStatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import type { StatsData, CatalogItem, Client, Job, Manpower } from "@/types";
import type { DateRangeKey } from "@/hooks/useOpsData";

type DashboardAction =
    | 'manpower-all'
    | 'manpower-online'
    | 'manpower-offline'
    | 'jobs-active'
    | 'jobs-missing'
    | 'jobs-completed'
    | 'vendors-all'
    | 'vendors-active'
    | 'vendors-offline'
    | 'products-all'
    | 'products-pending'
    | 'clients-manpower'
    | 'clients-vendor'
    | 'jobs-pending'
    | 'jobs-assigned';

interface DashboardProps {
    stats: StatsData | undefined;
    statsLoading: boolean;
    catalog: CatalogItem[] | undefined;
    catalogLoading: boolean;
    manpower: Manpower[] | undefined;
    manpowerLoading: boolean;
    clients: Client[] | undefined;
    clientsLoading: boolean;
    jobs: Job[] | undefined;
    jobsLoading: boolean;
    allVendors: any[] | undefined;
    allVendorsLoading: boolean;
    pendingProducts: any[] | undefined;
    pendingProductsLoading: boolean;
    onActionClick?: (action: DashboardAction) => void;
    dateRangeKey: DateRangeKey;
    onDateRangeChange: (key: DateRangeKey) => void;
}

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: '3days', label: 'Last 3 Days' },
    { key: '1week', label: 'Last Week' },
    { key: '1month', label: 'Last Month' },
];

export default function DashboardOverview({
    stats,
    statsLoading,
    catalog,
    catalogLoading,
    manpower,
    manpowerLoading,
    clients,
    clientsLoading,
    jobs,
    jobsLoading,
    allVendors,
    allVendorsLoading,
    pendingProducts,
    pendingProductsLoading,
    onActionClick,
    dateRangeKey,
    onDateRangeChange,
}: DashboardProps) {
    const isOnlineManpower = (worker: Manpower) =>
        !!worker.isOnline || worker.status === 'active' || worker.status === 'available';

    const onlineManpowerCount = (manpower ?? []).filter(isOnlineManpower).length;
    const offlineManpowerCount = (manpower ?? []).filter((worker) => !isOnlineManpower(worker)).length;

    const handleAction = (action: DashboardAction) => {
        if (typeof onActionClick === 'function') {
            onActionClick(action);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Filter by date:</span>
                </div>
                <div className="inline-flex gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                    {DATE_RANGE_OPTIONS.map(({ key, label }) => (
                        <Button
                            key={key}
                            onClick={() => onDateRangeChange(key)}
                            variant="ghost"
                            size="sm"
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                dateRangeKey === key
                                    ? 'bg-cyan-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Manpower Overview Section */}
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Hammer className="w-5 h-5 text-indigo-600" />
                        </div>
                        Manpower Overview
                        {dateRangeKey !== 'all' && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                ({DATE_RANGE_OPTIONS.find(o => o.key === dateRangeKey)?.label})
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Service workers and labor management</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <StatCard icon={<Hammer className="w-6 h-6" />} label="Total Manpower" value={manpower?.length || 0} loading={manpowerLoading} iconBg="bg-indigo-500/10" iconColor="text-indigo-600" onClick={() => handleAction('manpower-all')} />
                    <StatCard icon={<Users className="w-6 h-6" />} label="Online Workers" value={onlineManpowerCount} loading={manpowerLoading} subtitle="Ready to work" iconBg="bg-green-500/10" iconColor="text-green-600" onClick={() => handleAction('manpower-online')} />
                    <StatCard icon={<Users className="w-6 h-6" />} label="Offline Workers" value={offlineManpowerCount} loading={manpowerLoading} subtitle="Not available" iconBg="bg-red-500/10" iconColor="text-red-600" onClick={() => handleAction('manpower-offline')} />
                    <StatCard icon={<Wrench className="w-6 h-6" />} label="Active Jobs" value={jobs?.filter((j: any) => (j.jobType === 'manpower' || j.assignedWorkerId) && j.status === 'in-progress').length || 0} loading={jobsLoading} subtitle="Currently Assigned/Req" iconBg="bg-cyan-500/10" iconColor="text-cyan-600" onClick={() => handleAction('jobs-active')} />
                    <StatCard icon={<Wrench className="w-6 h-6" />} label="Missing Jobs" value={jobs?.filter((j: any) => (j.jobType === 'manpower' || j.assignedWorkerId === null) && j.status === 'pending').length || 0} loading={jobsLoading} subtitle="Needs Assignment" iconBg="bg-orange-500/10" iconColor="text-orange-600" onClick={() => handleAction('jobs-missing')} />
                    <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Completed Jobs" value={jobs?.filter((j: any) => (j.jobType === 'manpower' || j.assignedWorkerId) && j.status === 'completed').length || 0} loading={jobsLoading} subtitle={dateRangeKey === 'all' ? "Total Lifetime" : "In Period"} iconBg="bg-gray-500/10" iconColor="text-gray-600" onClick={() => handleAction('jobs-completed')} />
                </div>
            </section>

            {/* Vendor & Products Overview Section */}
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        Vendor & Products Overview
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Catalog and vendor management</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <StatCard icon={<Briefcase className="w-6 h-6" />} label="Total Vendors" value={allVendors?.length || 0} loading={allVendorsLoading} iconBg="bg-purple-500/10" iconColor="text-purple-600" onClick={() => handleAction('vendors-all')} />
                    <StatCard icon={<Users className="w-6 h-6" />} label="Active Vendors" value={allVendors?.filter((v: any) => v.verificationStatus === 'verified').length || 0} loading={allVendorsLoading} subtitle="Running Catalog" iconBg="bg-green-500/10" iconColor="text-green-600" onClick={() => handleAction('vendors-active')} />
                    <StatCard icon={<Users className="w-6 h-6" />} label="Offline Vendors" value={allVendors?.filter((v: any) => v.verificationStatus === 'rejected').length || 0} loading={allVendorsLoading} subtitle="Not Responsive" iconBg="bg-red-500/10" iconColor="text-red-600" onClick={() => handleAction('vendors-offline')} />
                    <StatCard icon={<Package className="w-6 h-6" />} label="Total Products" value={catalog?.length || 0} loading={catalogLoading} subtitle="All Items" iconBg="bg-blue-500/10" iconColor="text-blue-600" onClick={() => handleAction('products-all')} />
                    <StatCard icon={<Package className="w-6 h-6" />} label="Pending Products" value={pendingProducts?.length || 0} loading={pendingProductsLoading} subtitle="Needs Review" iconBg="bg-orange-500/10" iconColor="text-orange-600" onClick={() => handleAction('products-pending')} />
                    <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Products Sold" value={stats?.totalOrders || 0} loading={statsLoading} subtitle={dateRangeKey === 'all' ? "This Week" : "In Period"} iconBg="bg-cyan-500/10" iconColor="text-cyan-600" onClick={() => handleAction('products-all')} />
                </div>
            </section>

            {/* Client and Jobs Overview Section */}
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-pink-100 rounded-lg">
                            <Briefcase className="w-5 h-5 text-pink-600" />
                        </div>
                        Client and Jobs Overview
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Service and product fulfillment tracking</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Manpower Clients */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-200/50 shadow-sm p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-200 rounded-2xl">
                                <Hammer className="w-4 h-4 text-indigo-700" />
                            </div>
                            Manpower Clients (Service Jobs)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <MiniStatCard
                                label="Manpower Clients"
                                value={clients?.filter((c: any) => c.serviceType === 'manpower').length || 0}
                                color="text-indigo-700"
                                bgColor="bg-white"
                                loading={clientsLoading}
                                onClick={() => handleAction('clients-manpower')}
                            />
                            <MiniStatCard
                                label="Assigned Jobs"
                                value={jobs?.filter((j: any) => j.status === 'in-progress' && j.assignedWorkerId).length || 0}
                                color="text-blue-700"
                                bgColor="bg-white"
                                loading={jobsLoading}
                                onClick={() => handleAction('jobs-assigned')}
                            />
                            <MiniStatCard
                                label="Requested Jobs"
                                value={jobs?.filter((j: any) => j.status === 'pending').length || 0}
                                color="text-orange-700"
                                bgColor="bg-white"
                                loading={jobsLoading}
                                onClick={() => handleAction('jobs-pending')}
                            />
                            <MiniStatCard
                                label="Completed Jobs"
                                value={jobs?.filter((j: any) => j.status === 'completed').length || 0}
                                color="text-green-700"
                                bgColor="bg-white"
                                loading={jobsLoading}
                                onClick={() => handleAction('jobs-completed')}
                            />
                        </div>
                    </div>

                    {/* Vendor Clients */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-200/50 shadow-sm p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-200 rounded-2xl">
                                <ShoppingCart className="w-4 h-4 text-purple-700" />
                            </div>
                            Vendor Clients (Product Purchases)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <MiniStatCard
                                label="Vendor Clients"
                                value={clients?.filter((c: any) => c.serviceType === 'vendor').length || 0}
                                color="text-purple-700"
                                bgColor="bg-white"
                                loading={clientsLoading}
                                onClick={() => handleAction('clients-vendor')}
                            />
                            <MiniStatCard
                                label="Total Orders"
                                value={stats?.totalOrders || 0}
                                color="text-blue-700"
                                bgColor="bg-white"
                                loading={statsLoading}
                                onClick={() => handleAction('clients-vendor')}
                            />
                            <MiniStatCard
                                label="Products Purchased"
                                value={catalog?.length || 0}
                                color="text-orange-700"
                                bgColor="bg-white"
                                loading={catalogLoading}
                                onClick={() => handleAction('products-all')}
                            />
                            <MiniStatCard
                                label="High Value Clients"
                                value={clients?.filter((c: any) => c.serviceType === 'vendor').length || 0}
                                color="text-green-700"
                                bgColor="bg-white"
                                loading={clientsLoading}
                                onClick={() => handleAction('clients-vendor')}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
