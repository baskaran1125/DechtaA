import { useAuth } from "@/features/auth/useAuth";
import { useLocation } from "wouter";
import { Loader2, Search } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpsData, type DateRange, type DateRangeKey } from "@/hooks/useOpsData";
import type { TabType } from "@/types";

// Layout components
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ProfileModal from "@/components/ProfileModal";

// Feature pages
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import VendorManagement from "@/components/vendor/VendorManagement";
import DriversPage from "@/features/drivers/DriversPage";
import ManpowerPage from "@/features/manpower/ManpowerPage";
import ClientsPage from "@/features/clients/ClientsPage";
import JobsPage from "@/features/jobs/JobsPage";
import SupportPage from "@/features/support/SupportPage";
import SettingsPage from "@/features/settings/SettingsPage";
import ProductApprovalsPage from "@/features/approvals/ProductApprovalsPage";
import OnboardingPage from "@/features/onboarding/OnboardingPage";
import OnboardingHubPage from "@/features/onboarding/OnboardingHubPage";
import BulkProductsPage from "@/features/products/BulkProductsPage";
import BannerManagementPage from "@/features/banners/BannerManagementPage";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import TrackingPage from "@/features/tracking/TrackingPage";
import PricingPage from "@/features/pricing/PricingPage";
import ManpowerPricingPage from "@/features/manpower-pricing/ManpowerPricingPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";

const DARK_THEME_STYLES = `
    /* ═══════════════════════════════════════════════
       DECHTA OPS — COMPREHENSIVE DARK THEME
       ═══════════════════════════════════════════════ */

    /* ── Header ──────────────────────────────────── */
    [data-ops-theme='dark'] header {
        background: rgba(15, 23, 42, 0.92) !important;
        border-color: #1e293b !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
    }

    /* ── Core surface colours ────────────────────── */
    [data-ops-theme='dark'] .bg-white {
        background-color: #0f172a !important;
        border-color: #1e293b !important;
    }
    [data-ops-theme='dark'] .bg-gray-50,
    [data-ops-theme='dark'] .bg-gray-100 {
        background-color: #1e293b !important;
    }
    [data-ops-theme='dark'] .bg-white\\/80 {
        background-color: rgba(15, 23, 42, 0.92) !important;
    }

    /* ── Typography ──────────────────────────────── */
    [data-ops-theme='dark'] .text-gray-900,
    [data-ops-theme='dark'] .text-gray-800 {
        color: #f1f5f9 !important;
    }
    [data-ops-theme='dark'] .text-gray-700 {
        color: #cbd5e1 !important;
    }
    [data-ops-theme='dark'] .text-gray-600 {
        color: #94a3b8 !important;
    }
    [data-ops-theme='dark'] .text-gray-500 {
        color: #64748b !important;
    }
    [data-ops-theme='dark'] .text-gray-400 {
        color: #475569 !important;
    }

    /* ── Borders & dividers ──────────────────────── */
    [data-ops-theme='dark'] .border-gray-200,
    [data-ops-theme='dark'] .border-gray-100 {
        border-color: #1e293b !important;
    }
    [data-ops-theme='dark'] .divide-gray-100 > * + * {
        border-color: #1e293b !important;
    }
    [data-ops-theme='dark'] .border-gray-300 {
        border-color: #334155 !important;
    }

    /* ── Hover states ────────────────────────────── */
    [data-ops-theme='dark'] .hover\\:bg-gray-50:hover,
    [data-ops-theme='dark'] .hover\\:bg-gray-100:hover {
        background-color: #1e293b !important;
    }
    [data-ops-theme='dark'] .hover\\:bg-cyan-50\\/30:hover {
        background-color: rgba(6, 182, 212, 0.08) !important;
    }

    /* ── Form controls ───────────────────────────── */
    [data-ops-theme='dark'] input,
    [data-ops-theme='dark'] textarea,
    [data-ops-theme='dark'] select {
        background-color: #0f172a !important;
        color: #e2e8f0 !important;
        border-color: #334155 !important;
    }
    [data-ops-theme='dark'] input::placeholder,
    [data-ops-theme='dark'] textarea::placeholder {
        color: #475569 !important;
    }
    [data-ops-theme='dark'] input:focus,
    [data-ops-theme='dark'] textarea:focus {
        border-color: #06b6d4 !important;
        box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15) !important;
    }

    /* ── Shadows ─────────────────────────────────── */
    [data-ops-theme='dark'] .shadow-sm {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
    }
    [data-ops-theme='dark'] .shadow-md {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
    }
    [data-ops-theme='dark'] .shadow-lg {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55) !important;
    }
    [data-ops-theme='dark'] .shadow-xl,
    [data-ops-theme='dark'] .shadow-2xl {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6) !important;
    }

    /* ── Tables ──────────────────────────────────── */
    [data-ops-theme='dark'] table {
        color: #e2e8f0 !important;
    }
    [data-ops-theme='dark'] thead,
    [data-ops-theme='dark'] th {
        background-color: #0f172a !important;
        color: #94a3b8 !important;
        border-color: #1e293b !important;
    }
    [data-ops-theme='dark'] tbody tr {
        border-color: #1e293b !important;
    }
    [data-ops-theme='dark'] tbody tr:hover {
        background-color: rgba(6, 182, 212, 0.06) !important;
    }
    [data-ops-theme='dark'] td {
        color: #cbd5e1 !important;
    }

    /* ── Stat cards (overview boxes) ─────────────── */
    [data-ops-theme='dark'] .rounded-2xl,
    [data-ops-theme='dark'] .rounded-3xl {
        border-color: #1e293b !important;
    }

    /* ── Badge / Status pills ────────────────────── */
    [data-ops-theme='dark'] .bg-green-100 { background-color: rgba(34, 197, 94, 0.15) !important; }
    [data-ops-theme='dark'] .text-green-700 { color: #4ade80 !important; }
    [data-ops-theme='dark'] .bg-yellow-100 { background-color: rgba(234, 179, 8, 0.15) !important; }
    [data-ops-theme='dark'] .text-yellow-700 { color: #facc15 !important; }
    [data-ops-theme='dark'] .bg-red-100 { background-color: rgba(239, 68, 68, 0.15) !important; }
    [data-ops-theme='dark'] .text-red-700 { color: #f87171 !important; }
    [data-ops-theme='dark'] .bg-blue-100 { background-color: rgba(59, 130, 246, 0.15) !important; }
    [data-ops-theme='dark'] .text-blue-700 { color: #60a5fa !important; }
    [data-ops-theme='dark'] .bg-orange-100 { background-color: rgba(249, 115, 22, 0.15) !important; }
    [data-ops-theme='dark'] .text-orange-700 { color: #fb923c !important; }
    [data-ops-theme='dark'] .bg-purple-100 { background-color: rgba(147, 51, 234, 0.15) !important; }
    [data-ops-theme='dark'] .text-purple-700 { color: #c084fc !important; }

    /* ── Stat card icon backgrounds ──────────────── */
    [data-ops-theme='dark'] .bg-purple-500\\/10 { background-color: rgba(147, 51, 234, 0.12) !important; }
    [data-ops-theme='dark'] .bg-green-500\\/10 { background-color: rgba(34, 197, 94, 0.12) !important; }
    [data-ops-theme='dark'] .bg-red-500\\/10 { background-color: rgba(239, 68, 68, 0.12) !important; }
    [data-ops-theme='dark'] .bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.12) !important; }
    [data-ops-theme='dark'] .bg-orange-500\\/10 { background-color: rgba(249, 115, 22, 0.12) !important; }
    [data-ops-theme='dark'] .bg-cyan-500\\/10 { background-color: rgba(6, 182, 212, 0.12) !important; }

    /* ── Filter pill group (All / Active / Offline) ─ */
    [data-ops-theme='dark'] .rounded-lg.bg-gray-100 {
        background-color: #1e293b !important;
    }

    /* ── Modals / Dialog ─────────────────────────── */
    [data-ops-theme='dark'] [role="dialog"],
    [data-ops-theme='dark'] [data-radix-popper-content-wrapper] div {
        background-color: #0f172a !important;
        border-color: #1e293b !important;
        color: #e2e8f0 !important;
    }

    /* ── Scrollbar ───────────────────────────────── */
    [data-ops-theme='dark'] ::-webkit-scrollbar {
        width: 6px;
    }
    [data-ops-theme='dark'] ::-webkit-scrollbar-track {
        background: #0f172a;
    }
    [data-ops-theme='dark'] ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 3px;
    }
    [data-ops-theme='dark'] ::-webkit-scrollbar-thumb:hover {
        background: #475569;
    }

    /* ── Link colours ────────────────────────────── */
    [data-ops-theme='dark'] .text-cyan-700 {
        color: #22d3ee !important;
    }
    [data-ops-theme='dark'] .text-cyan-600 {
        color: #06b6d4 !important;
    }

    /* ── Decorative glows (enhance in dark mode) ─── */
    [data-ops-theme='dark'] .bg-cyan-400\\/5 {
        background-color: rgba(6, 182, 212, 0.03) !important;
    }
    [data-ops-theme='dark'] .bg-blue-400\\/5 {
        background-color: rgba(59, 130, 246, 0.03) !important;
    }

    /* ── Client & Jobs gradient containers ────────── */
    [data-ops-theme='dark'] .bg-gradient-to-br.from-indigo-50,
    [data-ops-theme='dark'] .from-indigo-50 {
        background: linear-gradient(135deg, rgba(67, 56, 202, 0.1), rgba(59, 130, 246, 0.08)) !important;
        border-color: rgba(99, 102, 241, 0.2) !important;
    }
    [data-ops-theme='dark'] .bg-gradient-to-br.from-purple-50,
    [data-ops-theme='dark'] .from-purple-50 {
        background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.08)) !important;
        border-color: rgba(168, 85, 247, 0.2) !important;
    }

    /* ── Accent icon badge backgrounds ────────────── */
    [data-ops-theme='dark'] .bg-indigo-200 {
        background-color: rgba(99, 102, 241, 0.2) !important;
    }
    [data-ops-theme='dark'] .text-indigo-700 {
        color: #818cf8 !important;
    }
    [data-ops-theme='dark'] .bg-purple-200 {
        background-color: rgba(168, 85, 247, 0.2) !important;
    }
    [data-ops-theme='dark'] .bg-pink-100 {
        background-color: rgba(236, 72, 153, 0.15) !important;
    }
    [data-ops-theme='dark'] .text-pink-600 {
        color: #f472b6 !important;
    }

    /* ── Indigo/purple borders for Client overview ── */
    [data-ops-theme='dark'] .border-indigo-200\\/50 {
        border-color: rgba(99, 102, 241, 0.2) !important;
    }
    [data-ops-theme='dark'] .border-purple-200\\/50 {
        border-color: rgba(168, 85, 247, 0.2) !important;
    }

    /* ── Cyan stat active background ─────────────── */
    [data-ops-theme='dark'] .bg-cyan-100 {
        background-color: rgba(6, 182, 212, 0.15) !important;
    }
`;

const TAB_ITEMS: { key: TabType; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'vendors', label: 'Vendor' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'manpower', label: 'Manpower' },
    { key: 'clients', label: 'Clients' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'support', label: 'Support' },
];

function getDateRangeFromKey(key: DateRangeKey): DateRange {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (key) {
        case 'today': {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            return { key, startDate, endDate };
        }
        case '3days': {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
            return { key, startDate, endDate };
        }
        case '1week': {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            return { key, startDate, endDate };
        }
        case '1month': {
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
            return { key, startDate, endDate };
        }
        default:
            return { key: 'all' };
    }
}

function resolveAdminBackendBase(): string {
    return String(import.meta.env.VITE_API_URL || "http://127.0.0.1:5003").trim().replace(/\/+$/, "");
}

export default function OpsDashboard() {
    const { user, isLoading: authLoading, logout } = useAuth();
    const [, setLocation] = useLocation();

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [manpowerFilter, setManpowerFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [vendorFilter, setVendorFilter] = useState<'all' | 'active' | 'offline'>('all');
    const [driversFilter, setDriversFilter] = useState<'all' | 'active' | 'offline'>('all');
    const [jobsFilter, setJobsFilter] = useState<'all' | 'active' | 'missing' | 'completed' | 'pending' | 'assigned'>('all');
    const [clientsFilter, setClientsFilter] = useState<'all' | 'manpower' | 'vendor'>('all');
    const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');

    const dateRange = useMemo(() => getDateRangeFromKey(dateRangeKey), [dateRangeKey]);

    const isAdmin = !!user && user.role === "admin";
    const opsData = useOpsData(isAdmin, dateRange);
    const [searchQuery, setSearchQuery] = useState('');

    const data = useMemo(() => {
        if (!searchQuery.trim()) return opsData;

        const q = searchQuery.toLowerCase();

        const searchObj = (obj: any): boolean => {
            if (!obj) return false;
            return Object.values(obj).some(v => {
                if (v === null || v === undefined) return false;
                if (typeof v === 'object') return searchObj(v);
                return String(v).toLowerCase().includes(q);
            });
        };

        const filterList = <T,>(list: T[] | undefined): T[] | undefined => {
            if (!list) return undefined;
            return list.filter(item => searchObj(item));
        };

        return {
            ...opsData,
            catalog: filterList(opsData.catalog),
            drivers: filterList(opsData.drivers),
            manpower: filterList(opsData.manpower),
            clients: filterList(opsData.clients),
            jobs: filterList(opsData.jobs),
            supportTickets: filterList(opsData.supportTickets),
            pendingProducts: filterList(opsData.pendingProducts),
            allProducts: filterList(opsData.allProducts),
            pendingVendors: filterList(opsData.pendingVendors),
            allVendors: filterList(opsData.allVendors),
            pendingWorkers: filterList(opsData.pendingWorkers),
            allWorkers: filterList(opsData.allWorkers),
            banners: filterList(opsData.banners),
            locations: filterList(opsData.locations)
        };
    }, [opsData, searchQuery]);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "admin")) {
            setLocation("/auth");
        }
    }, [authLoading, user, setLocation]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!user || user.role !== "admin") {
        return null;
    }

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

    const handleDashboardAction = (
        action:
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
            | 'jobs-assigned'
    ) => {
        if (action === 'manpower-all') {
            setManpowerFilter('all');
            setActiveTab('manpower');
            return;
        }
        if (action === 'manpower-online') {
            setManpowerFilter('online');
            setActiveTab('manpower');
            return;
        }
        if (action === 'manpower-offline') {
            setManpowerFilter('offline');
            setActiveTab('manpower');
            return;
        }
        if (action === 'jobs-active') {
            setJobsFilter('active');
            setActiveTab('jobs');
            return;
        }
        if (action === 'jobs-missing') {
            setJobsFilter('missing');
            setActiveTab('jobs');
            return;
        }
        if (action === 'jobs-completed') {
            setJobsFilter('completed');
            setActiveTab('jobs');
            return;
        }
        if (action === 'jobs-pending') {
            setJobsFilter('pending');
            setActiveTab('jobs');
            return;
        }
        if (action === 'jobs-assigned') {
            setJobsFilter('assigned');
            setActiveTab('jobs');
            return;
        }
        if (action === 'vendors-all') {
            setVendorFilter('all');
            setActiveTab('vendors');
            return;
        }
        if (action === 'vendors-active') {
            setVendorFilter('active');
            setActiveTab('vendors');
            return;
        }
        if (action === 'vendors-offline') {
            setVendorFilter('offline');
            setActiveTab('vendors');
            return;
        }
        if (action === 'products-all') {
            setActiveTab('bulk-products');
            return;
        }
        if (action === 'products-pending') {
            setActiveTab('approvals');
            return;
        }
        if (action === 'clients-manpower') {
            setClientsFilter('manpower');
            setActiveTab('clients');
            return;
        }

        setClientsFilter('vendor');
        setActiveTab('clients');
    };

    return (
        <div
            data-ops-theme={theme}
            className={`min-h-screen font-sans flex flex-col relative overflow-clip ${
                theme === "dark"
                    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-gray-100"
                    : "bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/50"
            }`}
        >
            <style>{DARK_THEME_STYLES}</style>

            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-400/5 rounded-full blur-3xl pointer-events-none z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-3xl pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full w-full">
                <Header
                email={user?.email}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenProfile={() => setShowProfileModal(true)}
                onOpenSettings={() => setActiveTab('settings')}
                onLogout={() => logout.mutate()}
            />

            <div className="flex w-full gap-6 px-4 py-6 sm:px-6 lg:px-8 pt-20">
                <Sidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div className="min-w-0 flex-1 md:ml-72">
                    {/* Welcome Section with Search */}
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name || 'Admin'}</h1>
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input 
                                type="text" 
                                placeholder="Search..." 
                                className="pl-10 h-11 rounded-lg bg-white border-gray-200 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mb-6">
                        <div className="inline-flex flex-wrap gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-md">
                            {TAB_ITEMS.map(({ key, label }) => (
                                <Button
                                    key={key}
                                    onClick={() => {
                                        setActiveTab(key);
                                    }}
                                    variant="ghost"
                                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                                        activeTab === key
                                            ? 'bg-black text-cyan-400 shadow-md'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="w-full pb-12">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <DashboardOverview
                                    stats={data.stats}
                                    statsLoading={data.statsLoading}
                                    catalog={data.catalog}
                                    catalogLoading={data.catalogLoading}
                                    manpower={data.manpower}
                                    manpowerLoading={data.manpowerLoading}
                                    clients={data.clients}
                                    clientsLoading={data.clientsLoading}
                                    jobs={data.jobs}
                                    jobsLoading={data.jobsLoading}
                                    allVendors={data.allVendors}
                                    allVendorsLoading={data.allVendorsLoading}
                                    pendingProducts={data.pendingProducts}
                                    pendingProductsLoading={data.pendingProductsLoading}
                                    onActionClick={handleDashboardAction}
                                    dateRangeKey={dateRangeKey}
                                    onDateRangeChange={setDateRangeKey}
                                />
                                <RecentActivity
                                    stats={data.stats}
                                    statsLoading={data.statsLoading}
                                />
                            </div>
                        )}

                        {activeTab === 'vendors' && (
                            <VendorManagement
                                vendors={data.allVendors}
                                vendorsLoading={data.allVendorsLoading}
                                catalog={data.catalog}
                                catalogLoading={data.catalogLoading}
                                products={data.allProducts}
                                productsLoading={data.allProductsLoading}
                                vendorFilter={vendorFilter}
                                onFilterChange={setVendorFilter}
                            />
                        )}

                        {activeTab === 'drivers' && (
                            <DriversPage
                                drivers={data.drivers}
                                driversLoading={data.driversLoading}
                                filter={driversFilter}
                                onFilterChange={setDriversFilter}
                            />
                        )}

                        {activeTab === 'manpower' && (
                            <ManpowerPage
                                manpower={data.manpower}
                                manpowerLoading={data.manpowerLoading}
                                filter={manpowerFilter}
                                onFilterChange={setManpowerFilter}
                            />
                        )}

                        {activeTab === 'clients' && (
                            <ClientsPage
                                clients={data.clients}
                                clientsLoading={data.clientsLoading}
                                filter={clientsFilter}
                            />
                        )}

                        {activeTab === 'jobs' && (
                            <JobsPage
                                jobs={data.jobs}
                                jobsLoading={data.jobsLoading}
                                orders={data.orders}
                                ordersLoading={data.ordersLoading}
                                filter={jobsFilter}
                            />
                        )}

                        {activeTab === 'support' && (
                            <div style={{ height: 'calc(100vh - 200px)' }} className="flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200 shadow-lg bg-white">
                                <SupportPage
                                    supportTickets={data.supportTickets}
                                    ticketsLoading={data.ticketsLoading}
                                />
                            </div>
                        )}

                        {activeTab === 'approvals' && (
                            <ProductApprovalsPage
                                pendingProducts={data.pendingProducts}
                                pendingProductsLoading={data.pendingProductsLoading}
                                allProducts={data.allProducts}
                                allProductsLoading={data.allProductsLoading}
                            />
                        )}

                        {activeTab === 'onboarding' && (
                            <OnboardingPage
                                pendingVendors={data.pendingVendors}
                                pendingVendorsLoading={data.pendingVendorsLoading}
                                allVendors={data.allVendors}
                                allVendorsLoading={data.allVendorsLoading}
                                pendingWorkers={data.pendingWorkers}
                                pendingWorkersLoading={data.pendingWorkersLoading}
                                allWorkers={data.allWorkers}
                                allWorkersLoading={data.allWorkersLoading}
                                pendingDrivers={data.pendingDrivers}
                                pendingDriversLoading={data.pendingDriversLoading}
                                allDrivers={data.allDriversOnboarding}
                                allDriversLoading={data.allDriversOnboardingLoading}
                            />
                        )}

                        {activeTab === 'onboarding-hub' && (
                            <OnboardingHubPage />
                        )}

                        {activeTab === 'bulk-products' && (
                            <BulkProductsPage
                                catalog={data.catalog}
                                catalogLoading={data.catalogLoading}
                            />
                        )}

                        {activeTab === 'banners' && (
                            <BannerManagementPage
                                banners={data.banners}
                                bannersLoading={data.bannersLoading}
                            />
                        )}

                        {activeTab === 'analytics' && (
                            <AnalyticsPage
                                analytics={data.analytics}
                                analyticsLoading={data.analyticsLoading}
                            />
                        )}

                        {activeTab === 'tracking' && (
                            <TrackingPage
                                locations={data.locations}
                                locationsLoading={data.locationsLoading}
                                drivers={data.drivers}
                                manpower={data.manpower}
                            />
                        )}

                        {activeTab === 'pricing' && (
                            <PricingPage />
                        )}

                        {activeTab === 'manpower-pricing' && (
                            <ManpowerPricingPage />
                        )}

                        {activeTab === 'notifications' && (
                            <NotificationsPage />
                        )}

                        {activeTab === 'settings' && (
                            <SettingsPage
                                user={user}
                                theme={theme}
                                onToggleTheme={toggleTheme}
                            />
                        )}
                    </main>
                </div>
            </div>

            <ProfileModal
                open={showProfileModal}
                onOpenChange={setShowProfileModal}
                user={user}
            />
            </div>
        </div>
    );
}
