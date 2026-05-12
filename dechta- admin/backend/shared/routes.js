import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertCatalogItemSchema } from './schema';
export const errorSchemas = {
    validation: z.object({ message: z.string(), field: z.string().optional() }),
    unauthorized: z.object({ message: z.string() }),
    notFound: z.object({ message: z.string() }),
};
export const api = {
    auth: {
        register: {
            method: 'POST',
            path: '/api/auth/register',
            input: insertUserSchema,
            responses: {
                201: z.custom(),
                400: errorSchemas.validation,
            }
        },
        login: {
            method: 'POST',
            path: '/api/auth/login',
            input: z.object({ email: z.string().email(), password: z.string() }),
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            }
        },
        logout: {
            method: 'POST',
            path: '/api/auth/logout',
            responses: {
                200: z.object({ message: z.string() })
            }
        },
        me: {
            method: 'GET',
            path: '/api/auth/me',
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            }
        }
    },
    products: {
        list: {
            method: 'GET',
            path: '/api/products',
            responses: {
                200: z.array(z.custom()),
            }
        },
        create: {
            method: 'POST',
            path: '/api/products',
            input: insertProductSchema,
            responses: {
                201: z.custom(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        vendorList: {
            method: 'GET',
            path: '/api/vendor/products',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            }
        }
    },
    ops: {
        stats: {
            method: 'GET',
            path: '/api/ops/stats',
            responses: {
                200: z.object({
                    totalUsers: z.number(),
                    totalOrders: z.number(),
                    recentUsers: z.array(z.any()),
                    recentOrders: z.array(z.any())
                }),
                401: errorSchemas.unauthorized,
            }
        },
        catalog: {
            method: 'GET',
            path: '/api/ops/catalog',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            }
        },
        createCatalogItem: {
            method: 'POST',
            path: '/api/ops/catalog',
            input: insertCatalogItemSchema,
            responses: {
                201: z.custom(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        pendingProducts: {
            method: 'GET',
            path: '/api/ops/products/pending',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        allProducts: {
            method: 'GET',
            path: '/api/ops/products',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        approveProduct: {
            method: 'PATCH',
            path: '/api/ops/products/:id/approve',
            responses: {
                200: z.custom(),
                401: errorSchemas.unauthorized,
            }
        },
        rejectProduct: {
            method: 'PATCH',
            path: '/api/ops/products/:id/reject',
            input: z.object({ reason: z.string().min(1) }),
            responses: {
                200: z.custom(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        // Onboarding Hub - Create vendor/driver/manpower
        createVendor: {
            method: 'POST',
            path: '/api/ops/onboarding/vendors',
            input: z.object({
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
                phone: z.string().optional(),
                ownerName: z.string().optional(),
                whatsappNumber: z.string().optional(),
                businessAddress: z.string().optional(),
                warehouseAddress: z.string().optional(),
                googleMapsLocation: z.string().optional(),
                yearsOfBusinessExperience: z.string().optional(),
                businessType: z.string().optional(),
                gstNumber: z.string().optional(),
                panNumber: z.string().optional(),
                udyamRegistrationNumber: z.string().optional(),
                bankAccountDetails: z.string().optional(),
                gstUrl: z.string().optional().nullable(),
                panUrl: z.string().optional().nullable(),
                aadharUrl: z.string().optional().nullable(),
                cancelledChequeUrl: z.string().optional().nullable(),
                gstCertificateUrl: z.string().optional().nullable(),
                shopLicenseUrl: z.string().optional().nullable(),
                businessLicenseUrl: z.string().optional().nullable(),
            }),
            responses: {
                201: z.any(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        // Onboarding - Vendors
        pendingVendors: {
            method: 'GET',
            path: '/api/ops/onboarding/vendors',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        allVendors: {
            method: 'GET',
            path: '/api/ops/onboarding/vendors/all',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        vendorDocuments: {
            method: 'GET',
            path: '/api/ops/onboarding/vendors/:id/documents',
            responses: {
                200: z.any(),
                401: errorSchemas.unauthorized,
            }
        },
        verifyVendor: {
            method: 'PATCH',
            path: '/api/ops/onboarding/vendors/:id/verify',
            responses: {
                200: z.any(),
                401: errorSchemas.unauthorized,
            }
        },
        rejectVendor: {
            method: 'PATCH',
            path: '/api/ops/onboarding/vendors/:id/reject',
            input: z.object({ reason: z.string().min(1) }),
            responses: {
                200: z.any(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        // Onboarding - Manpower
        pendingManpower: {
            method: 'GET',
            path: '/api/ops/onboarding/manpower',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        allManpower: {
            method: 'GET',
            path: '/api/ops/onboarding/manpower/all',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        manpowerDocuments: {
            method: 'GET',
            path: '/api/ops/onboarding/manpower/:id/documents',
            responses: {
                200: z.any(),
                401: errorSchemas.unauthorized,
            }
        },
        verifyManpower: {
            method: 'PATCH',
            path: '/api/ops/onboarding/manpower/:id/verify',
            responses: {
                200: z.any(),
                401: errorSchemas.unauthorized,
            }
        },
        rejectManpower: {
            method: 'PATCH',
            path: '/api/ops/onboarding/manpower/:id/reject',
            input: z.object({ reason: z.string().min(1) }),
            responses: {
                200: z.any(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        // Commission Settings
        getCommissionSettings: {
            method: 'GET',
            path: '/api/ops/settings/commission',
            responses: {
                200: z.object({ vendorCommission: z.string(), manpowerCommission: z.string(), driverCommission: z.string() }),
                401: errorSchemas.unauthorized,
            }
        },
        updateCommissionSettings: {
            method: 'PUT',
            path: '/api/ops/settings/commission',
            input: z.object({
                vendorCommission: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid number'),
                manpowerCommission: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid number'),
                driverCommission: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid number'),
            }),
            responses: {
                200: z.object({ vendorCommission: z.string(), manpowerCommission: z.string(), driverCommission: z.string() }),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        // Banners
        listBanners: {
            method: 'GET',
            path: '/api/ops/banners',
            responses: {
                200: z.array(z.any()),
                401: errorSchemas.unauthorized,
            }
        },
        activeBanners: {
            method: 'GET',
            path: '/api/banners',
            responses: {
                200: z.array(z.any()),
            }
        },
        createBanner: {
            method: 'POST',
            path: '/api/ops/banners',
            input: z.object({
                title: z.string().min(1),
                subtitle: z.string().optional(),
                imageUrl: z.string().min(1),
                linkUrl: z.string().optional(),
                targetPages: z.array(z.enum(['all', 'manpower', 'client', 'vendor', 'driver'])).optional(),
                position: z.enum(['hero', 'sidebar', 'inline', 'popup']).default('hero'),
                active: z.enum(['true', 'false']).default('true'),
                displayOrder: z.number().int().default(0),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            responses: {
                201: z.any(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        updateBanner: {
            method: 'PATCH',
            path: '/api/ops/banners/:id',
            input: z.object({
                title: z.string().min(1).optional(),
                subtitle: z.string().optional(),
                imageUrl: z.string().min(1).optional(),
                linkUrl: z.string().optional(),
                targetPages: z.array(z.enum(['all', 'manpower', 'client', 'vendor', 'driver'])).optional(),
                position: z.enum(['hero', 'sidebar', 'inline', 'popup']).optional(),
                active: z.enum(['true', 'false']).optional(),
                displayOrder: z.number().int().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            responses: {
                200: z.any(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        },
        deleteBanner: {
            method: 'DELETE',
            path: '/api/ops/banners/:id',
            responses: {
                200: z.object({ message: z.string() }),
                401: errorSchemas.unauthorized,
            }
        }
    },
    orders: {
        list: {
            method: 'GET',
            path: '/api/orders',
            responses: {
                200: z.array(z.custom()),
                401: errorSchemas.unauthorized,
            }
        },
        create: {
            method: 'POST',
            path: '/api/orders',
            input: insertOrderSchema,
            responses: {
                201: z.custom(),
                400: errorSchemas.validation,
                401: errorSchemas.unauthorized,
            }
        }
    }
};
export function buildUrl(path, params) {
    let url = path;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (url.includes(`:${key}`)) {
                url = url.replace(`:${key}`, String(value));
            }
        });
    }
    return url;
}
