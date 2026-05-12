import { useQuery } from "@tanstack/react-query";
import type { StatsData, CatalogItem, Driver, Manpower, Client, Job, OpsOrder, SupportTicket, PendingProduct, PendingVendor, PendingWorker, PendingDriver, Banner, AnalyticsData, LocationUpdate } from "@/types";

export type DateRangeKey = 'all' | 'today' | '3days' | '1week' | '1month';

export interface DateRange {
    key: DateRangeKey;
    startDate?: Date;
    endDate?: Date;
}

function buildUrlWithDateParams(basePath: string, dateRange?: DateRange): string {
    if (!dateRange || dateRange.key === 'all' || !dateRange.startDate) {
        return basePath;
    }
    const params = new URLSearchParams();
    if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
    }
    if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
    }
    return `${basePath}?${params.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
    return res.json();
}

function mapDriverToPending(driver: any): PendingDriver {
    const status = String(driver?.status || '').toLowerCase();
    const verificationStatusRaw = String(driver?.verificationStatus || driver?.verification_status || '').toLowerCase();
    const explicitApproved = driver?.isApproved === true || driver?.is_approved === true;
    const explicitRejected = driver?.isRejected === true || driver?.is_rejected === true;
    const rejected = explicitRejected || verificationStatusRaw === 'rejected' || status === 'suspended' || status === 'banned';
    const approved = !rejected && (explicitApproved || verificationStatusRaw === 'verified');
    return {
        id: Number(driver?.id || 0),
        fullName: driver?.name || `Driver #${driver?.id || '?'}`,
        phone: driver?.phone || '',
        email: driver?.email || null,
        licenseNumber: driver?.licenseNumber || driver?.license_number || null,
        vehicleType: driver?.vehicleType || driver?.vehicle_type || null,
        vehicleNumber: driver?.vehicleNumber || driver?.vehicle_number || null,
        location: driver?.location || null,
        isApproved: approved,
        isRejected: rejected,
        verificationStatus: approved ? 'verified' : (rejected ? 'rejected' : 'pending'),
        rejectionReason: driver?.rejectionReason || driver?.rejection_reason || null,
        createdAt: driver?.createdAt || driver?.created_at || null,
    };
}

export function useOpsData(enabled: boolean, dateRange?: DateRange) {
    const stats = useQuery<StatsData>({
        queryKey: [buildUrlWithDateParams("/api/ops/stats", dateRange)],
        enabled,
    });

    const catalog = useQuery<CatalogItem[]>({
        queryKey: ["/api/ops/catalog"],
        enabled,
    });

    const drivers = useQuery<Driver[]>({
        queryKey: ["/api/ops/drivers"],
        enabled,
    });

    const manpower = useQuery<Manpower[]>({
        queryKey: [buildUrlWithDateParams("/api/ops/manpower", dateRange)],
        enabled,
    });

    const clients = useQuery<Client[]>({
        queryKey: [buildUrlWithDateParams("/api/ops/clients", dateRange)],
        enabled,
    });

    const jobs = useQuery<Job[]>({
        queryKey: [buildUrlWithDateParams("/api/ops/jobs", dateRange)],
        enabled,
    });

    const orders = useQuery<OpsOrder[]>({
        queryKey: ["/api/ops/orders"],
        enabled,
    });

    const supportTickets = useQuery<SupportTicket[]>({
        queryKey: ["/api/ops/support"],
        enabled,
    });

    const pendingProducts = useQuery<PendingProduct[]>({
        queryKey: ["/api/ops/products/pending"],
        enabled,
    });

    const allProducts = useQuery<PendingProduct[]>({
        queryKey: ["/api/ops/products"],
        enabled,
    });

    const pendingVendors = useQuery<PendingVendor[]>({
        queryKey: ["/api/ops/onboarding/vendors"],
        enabled,
        refetchInterval: 15000,
    });

    const allVendors = useQuery<PendingVendor[]>({
        queryKey: ["/api/ops/onboarding/vendors/all"],
        enabled,
        refetchInterval: 15000,
    });

    const pendingWorkers = useQuery<PendingWorker[]>({
        queryKey: ["/api/ops/onboarding/manpower"],
        enabled,
        refetchInterval: 15000,
    });

    const allWorkers = useQuery<PendingWorker[]>({
        queryKey: ["/api/ops/onboarding/manpower/all"],
        enabled,
        refetchInterval: 15000,
    });

    const pendingDrivers = useQuery<PendingDriver[]>({
        queryKey: ["/api/ops/onboarding/drivers"],
        enabled,
        refetchInterval: 15000,
    });

    const allDriversOnboarding = useQuery<PendingDriver[]>({
        queryKey: ["/api/ops/onboarding/drivers/all"],
        enabled,
        refetchInterval: 15000,
    });

    const bannersList = useQuery<Banner[]>({
        queryKey: ["/api/ops/banners"],
        enabled,
    });

    const analytics = useQuery<AnalyticsData>({
        queryKey: ["/api/ops/analytics"],
        enabled,
    });

    const locations = useQuery<LocationUpdate[]>({
        queryKey: ["/api/ops/locations"],
        enabled,
        refetchInterval: 10000, // Auto-refresh every 10 seconds for live tracking
    });

    return {
        stats: stats.data,
        statsLoading: stats.isLoading,
        catalog: catalog.data,
        catalogLoading: catalog.isLoading,
        drivers: drivers.data,
        driversLoading: drivers.isLoading,
        manpower: manpower.data,
        manpowerLoading: manpower.isLoading,
        clients: clients.data,
        clientsLoading: clients.isLoading,
        jobs: jobs.data,
        jobsLoading: jobs.isLoading,
        orders: orders.data,
        ordersLoading: orders.isLoading,
        supportTickets: supportTickets.data,
        ticketsLoading: supportTickets.isLoading,
        pendingProducts: pendingProducts.data,
        pendingProductsLoading: pendingProducts.isLoading,
        allProducts: allProducts.data,
        allProductsLoading: allProducts.isLoading,
        pendingVendors: pendingVendors.data,
        pendingVendorsLoading: pendingVendors.isLoading,
        allVendors: allVendors.data,
        allVendorsLoading: allVendors.isLoading,
        pendingWorkers: pendingWorkers.data,
        pendingWorkersLoading: pendingWorkers.isLoading,
        allWorkers: allWorkers.data,
        allWorkersLoading: allWorkers.isLoading,
        pendingDrivers: pendingDrivers.data,
        pendingDriversLoading: pendingDrivers.isLoading,
        allDriversOnboarding: allDriversOnboarding.data,
        allDriversOnboardingLoading: allDriversOnboarding.isLoading,
        banners: bannersList.data,
        bannersLoading: bannersList.isLoading,
        analytics: analytics.data,
        analyticsLoading: analytics.isLoading,
        locations: locations.data,
        locationsLoading: locations.isLoading,
    };
}
