export interface StatsData {
    totalUsers: number;
    totalOrders: number;
    recentUsers: Array<{ id: number; name: string; email: string; role: string }>;
    recentOrders: Array<{ id: number; buyer: { name: string }; product: { name: string }; status: string }>;
}

export interface CatalogItem {
    id: number;
    name: string;
    category: string;
    description: string;
    imageUrl: string | null;
    brand: string | null;
    detailedDescription: string | null;
    productQuality: string | null;
    warranty: string | null;
    hsnCode: string | null;
    stock: number | null;
    unit: string | null;
    isBulk: boolean | null;
    bulkDiscount: string | null;
    mrp: string | null;
    sellingPrice: string | null;
    gstPercent: string | null;
    lengthCm: string | null;
    widthCm: string | null;
    heightCm: string | null;
    weightKg: string | null;
    selfDelivery: boolean | null;
    vehicleType: string | null;
    active: boolean | null;
    createdAt: string | null;
}

export interface Driver {
    id: number;
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    licenseNumber: string;
    status: string;
    photoUrl: string | null;
    driverType: string | null;
    bankAccountNumber: string | null;
    bankIFSC: string | null;
    bankName: string | null;
    bankBranch: string | null;
    location: string | null;
    serviceRating: string | null;
}

export interface Manpower {
    id: string;
    fullName: string;
    phone: string;
    skill: string | null;
    experience: string | null;
    state: string | null;
    city: string | null;
    area: string | null;
    qualification: string | null;
    aadharNumber: string | null;
    panNumber: string | null;
    serviceAddress: string | null;
    bankAccountNumber: string | null;
    bankIFSC: string | null;
    bankName: string | null;
    bankBranch: string | null;
    rating: string;
    reviewsCount: string;
    isApproved: boolean;
    isOnline: boolean;
    isFrozen: boolean;
    status: string;
    createdAt: string | null;
}

export interface Client {
    id: number;
    name: string;
    email: string;
    phone: string;
    company: string | null;
    area: string;
    address: string | null;
    serviceType: string;
}

export interface Job {
    id: number;
    title: string;
    description: string;
    jobType: string;
    status: string; // 'pending' | 'booked' | 'ongoing' | 'in-progress' | 'completed' | 'cancelled'
    deadline: string | null;
    client: { id: number; name: string; email: string; phone: string; area: string };
    assignedDriverId: number | null;
    assignedWorkerId: string | null;
}

export interface OpsOrder {
    id: number;
    quantity: number;
    status: string; // 'pending' | 'ordered' | 'dispatched' | 'delivered' | 'completed' | 'cancelled'
    assignedDriverId: number | null;
    product: {
        id: number;
        price: string;
        name: string;
        category: string;
        vendorId: number;
    };
    buyer: {
        id: number;
        name: string;
        phone: string | null;
        email: string;
    };
    vendor: {
        id: number;
        name: string;
        phone: string | null;
    } | null;
    driver: {
        id: number;
        name: string;
        phone: string | null;
    } | null;
}

export interface SupportTicket {
    id: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    user: { id: number; name: string; email: string; role: string };
}

export interface PendingProduct {
    id: number;
    vendorId: number;
    price: string;
    sellingPrice: string;
    hsnCode: string | null;
    gst: string;
    stock: number;
    catalogItemId: number;
    name: string;
    category: string;
    description: string;
    imageUrl: string | null;
    approvalStatus: string;
    rejectionReason: string | null;
}

export type TabType = 'dashboard' | 'vendors' | 'drivers' | 'manpower' | 'clients' | 'jobs' | 'support' | 'settings' | 'approvals' | 'onboarding' | 'onboarding-hub' | 'bulk-products' | 'banners' | 'analytics' | 'tracking' | 'pricing' | 'manpower-pricing' | 'notifications';

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface ChatParticipant {
    id: string;
    type: string;
    name: string;
    avatar: string | null;
}

export interface ChatMessage {
    id: number;
    conversationId: number;
    senderType: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'image' | 'file' | 'system';
    fileUrl: string | null;
    fileName: string | null;
    readAt: string | null;
    createdAt: string;
    sender?: ChatParticipant | null;
}

export interface ChatConversation {
    id: number;
    participant1Type: string;
    participant1Id: string;
    participant2Type: string;
    participant2Id: string;
    title: string | null;
    conversationType: 'support' | 'order' | 'job' | 'direct';
    supportTicketId: number | null;
    relatedEntityType: string | null;
    relatedEntityId: number | null;
    status: 'active' | 'archived' | 'closed';
    lastMessageAt: string | null;
    createdAt: string;
    lastMessage?: ChatMessage | null;
    unreadCount?: number;
    otherParticipant?: ChatParticipant | null;
    supportTicket?: {
        id: number;
        subject: string;
        description: string;
        status: string;
        priority: string;
        createdAt: string;
    } | null;
}

export interface SupportTicketWithConvo extends SupportTicket {
    conversation?: ChatConversation | null;
}

export interface VehiclePricing {
    id: number;
    vehicleType: string;
    displayName: string;
    baseFare: string;
    ratePerKm: string;
    minKm: string;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface ManpowerPricing {
    id: number;
    serviceCategory: string;
    serviceName: string;
    serviceCode: string;
    description: string | null;
    basePrice: string;
    ratePerHour: string;
    minHours: string;
    estimatedDuration: string | null;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface Notification {
    id: number;
    title: string;
    message: string;
    targetApp: string;
    targetUsers: string | null;
    type: 'info' | 'promo' | 'alert' | 'update';
    imageUrl: string | null;
    linkUrl: string | null;
    scheduledAt: string | null;
    sentAt: string | null;
    status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
    createdBy: number | null;
    createdAt: string | null;
}

export interface Banner {
    id: number;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    linkUrl: string | null;
    targetPages: string | null;
    position: string;
    active: string;
    displayOrder: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
}

export interface PendingVendor {
    id: number;
    name: string;
    shopName?: string | null;
    email: string;
    role: string;
    phone: string | null;
    ownerName: string | null;
    whatsappNumber: string | null;
    businessAddress: string | null;
    shopAddress?: string | null;
    warehouseAddress: string | null;
    googleMapsLocation: string | null;
    locationLabel?: string | null;
    locationUpdatedAt?: string | null;
    shopLatitude?: number | string | null;
    shopLongitude?: number | string | null;
    gstNumber?: string | null;
    yearsOfBusinessExperience: string | null;
    businessType: string | null;
    verificationStatus: string;
    rejectionReason: string | null;
    createdAt: string | null;
    totalProducts: number;
    walletDue: string | null;
}

export interface VendorDocs {
    id?: number;
    vendorId?: number;
    gstNumber?: string | null;
    panNumber?: string | null;
    udyamRegistrationNumber?: string | null;
    bankAccountDetails?: string | null;
    gstUrl: string | null;
    panUrl: string | null;
    aadharUrl: string | null;
    cancelledChequeUrl?: string | null;
    gstCertificateUrl?: string | null;
    shopLicenseUrl?: string | null;
    businessLicenseUrl: string | null;
    panImageUrl?: string | null;
    panFrontUrl?: string | null;
    panBackUrl?: string | null;
    aadharFrontUrl?: string | null;
    aadharBackUrl?: string | null;
    registrationCertificateUrl?: string | null;
    passbookCancelledChequeUrl?: string | null;
    profileDetails?: Record<string, any> | null;
    companyDetails?: Record<string, any> | null;
    bankDetails?: Record<string, any> | null;
    addressDetails?: Record<string, any> | null;
    rawDocuments?: Record<string, any> | null;
}

export interface PendingWorker {
    id: string;
    fullName: string;
    phone: string;
    skill: string | null;
    experience: string | null;
    state: string | null;
    city: string | null;
    area: string | null;
    qualification?: string | null;
    aadharNumber?: string | null;
    panNumber?: string | null;
    serviceAddress?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    photoUrl?: string | null;
    aadharUrl?: string | null;
    panUrl?: string | null;
    skillCertificateUrl?: string | null;
    bankMandateUrl?: string | null;
    isApproved: boolean;
    isFrozen: boolean;
    verificationStatus: string;
    createdAt: string | null;
}

export interface ManpowerDocs {
    id?: string;
    workerId?: string;
    photoUrl?: string | null;
    aadharUrl: string | null;
    panUrl: string | null;
    aadharFrontUrl?: string | null;
    aadharBackUrl?: string | null;
    panFrontUrl?: string | null;
    panBackUrl?: string | null;
    skillCertificateUrl: string | null;
    bankMandateUrl?: string | null;
}

export interface PendingDriver {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
    licenseNumber: string | null;
    vehicleType: string | null;
    vehicleNumber: string | null;
    vehicleModelId?: string | null;
    vehicleModelName?: string | null;
    vehicleWeight?: string | number | null;
    vehicleDimensions?: string | null;
    bodyType?: string | null;
    location: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isApproved: boolean;
    isRejected: boolean;
    verificationStatus: string;
    rejectionReason: string | null;
    createdAt: string | null;
}

export interface DriverOnboardingDocs {
    id?: number;
    driverId?: number;
    photoUrl?: string | null;
    aadharUrl?: string | null;
    addressProofUrl?: string | null;
    rcBookUrl?: string | null;
    licenseUrl?: string | null;
    allDocuments?: DriverOnboardingDocument[];
}

export interface DriverOnboardingDocument {
    documentType: string;
    documentUrl: string | null;
    frontUrl?: string | null;
    backUrl?: string | null;
    status?: string | null;
    rejectionReason?: string | null;
}

export interface DriverOnboardingDetails {
    id: number;
    profile: {
        id: number;
        userId?: number | null;
        fullName: string | null;
        phone: string | null;
        email: string | null;
        dob: string | null;
        bloodGroup: string | null;
        tshirtSize: string | null;
        emergencyContact: string | null;
        preferredZone: string | null;
        avatarUrl: string | null;
        referralCode: string | null;
        isRegistered: boolean;
        isApproved: boolean;
        verificationStatus: string | null;
        rejectionReason: string | null;
        createdAt: string | null;
        updatedAt: string | null;
    } | null;
    driver: {
        id: number;
        name: string | null;
        email: string | null;
        phone: string | null;
        vehicleType: string | null;
        vehicleNumber: string | null;
        licenseNumber: string | null;
        vehicleModelId: string | null;
        vehicleModelName: string | null;
        vehicleWeight: string | number | null;
        vehicleDimensions: string | null;
        bodyType: string | null;
        location: string | null;
        latitude: number | null;
        longitude: number | null;
        status: string;
        verificationStatus: string | null;
        rejectionReason: string | null;
        photoUrl: string | null;
        driverType: string | null;
        bankAccountNumber: string | null;
        bankIFSC: string | null;
        bankName: string | null;
        bankBranch: string | null;
        serviceRating: string | null;
        createdAt: string | null;
    } | null;
    vehicle: {
        vehicleType: string | null;
        vehicleNumber: string | null;
        licenseNumber: string | null;
        vehicleModelId: string | null;
        vehicleModelName: string | null;
        vehicleWeight: string | number | null;
        vehicleDimensions: string | null;
        bodyType: string | null;
        location: string | null;
    } | null;
    bank: {
        accountHolderName: string | null;
        accountNumber: string | null;
        ifscCode: string | null;
        bankBranch: string | null;
        upiId: string | null;
        isVerified: boolean;
    } | null;
    documents: DriverOnboardingDocs & {
        allDocuments?: DriverOnboardingDocument[];
    };
}

export interface AnalyticsData {
    totals: {
        users: number;
        orders: number;
        drivers: number;
        workers: number;
        clients: number;
        jobs: number;
        products: number;
        tickets: number;
    };
    ordersByStatus: Array<{ name: string; value: number }>;
    jobsByStatus: Array<{ name: string; value: number }>;
    usersByRole: Array<{ name: string; value: number }>;
    ticketsByStatus: Array<{ name: string; value: number }>;
    ticketsByPriority: Array<{ name: string; value: number }>;
    userGrowth: Array<{ date: string; count: number }>;
    jobsOverTime: Array<{ date: string; count: number }>;
    driversByStatus: Array<{ name: string; value: number }>;
    workersByApproval: Array<{ name: string; value: number }>;
}

export interface LocationUpdate {
    id: number;
    entityType: string;
    entityId: string;
    latitude: string;
    longitude: string;
    heading: string;
    speed: string;
    updatedAt: string;
}
