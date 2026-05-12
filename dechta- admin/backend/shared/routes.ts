import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertCatalogItemSchema, users, products, orders, catalogItems } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  unauthorized: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    vendorList: {
      method: 'GET' as const,
      path: '/api/vendor/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    }
  },
  ops: {
    stats: {
      method: 'GET' as const,
      path: '/api/ops/stats' as const,
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
      method: 'GET' as const,
      path: '/api/ops/catalog' as const,
      responses: {
        200: z.array(z.custom<typeof catalogItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    createCatalogItem: {
      method: 'POST' as const,
      path: '/api/ops/catalog' as const,
      input: insertCatalogItemSchema,
      responses: {
        201: z.custom<typeof catalogItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    pendingProducts: {
      method: 'GET' as const,
      path: '/api/ops/products/pending' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    allProducts: {
      method: 'GET' as const,
      path: '/api/ops/products' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    approveProduct: {
      method: 'PATCH' as const,
      path: '/api/ops/products/:id/approve' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    rejectProduct: {
      method: 'PATCH' as const,
      path: '/api/ops/products/:id/reject' as const,
      input: z.object({ reason: z.string().min(1) }),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    // Onboarding Hub - Create vendor/driver/manpower
    createVendor: {
      method: 'POST' as const,
      path: '/api/ops/onboarding/vendors' as const,
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
      method: 'GET' as const,
      path: '/api/ops/onboarding/vendors' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    allVendors: {
      method: 'GET' as const,
      path: '/api/ops/onboarding/vendors/all' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    vendorDocuments: {
      method: 'GET' as const,
      path: '/api/ops/onboarding/vendors/:id/documents' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    verifyVendor: {
      method: 'PATCH' as const,
      path: '/api/ops/onboarding/vendors/:id/verify' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    rejectVendor: {
      method: 'PATCH' as const,
      path: '/api/ops/onboarding/vendors/:id/reject' as const,
      input: z.object({ reason: z.string().min(1) }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    // Onboarding - Manpower
    pendingManpower: {
      method: 'GET' as const,
      path: '/api/ops/onboarding/manpower' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    allManpower: {
      method: 'GET' as const,
      path: '/api/ops/onboarding/manpower/all' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    manpowerDocuments: {
      method: 'GET' as const,
      path: '/api/ops/onboarding/manpower/:id/documents' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    verifyManpower: {
      method: 'PATCH' as const,
      path: '/api/ops/onboarding/manpower/:id/verify' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    rejectManpower: {
      method: 'PATCH' as const,
      path: '/api/ops/onboarding/manpower/:id/reject' as const,
      input: z.object({ reason: z.string().min(1) }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    // Commission Settings
    getCommissionSettings: {
      method: 'GET' as const,
      path: '/api/ops/settings/commission' as const,
      responses: {
        200: z.object({ vendorCommission: z.string(), manpowerCommission: z.string(), driverCommission: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    updateCommissionSettings: {
      method: 'PUT' as const,
      path: '/api/ops/settings/commission' as const,
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
      method: 'GET' as const,
      path: '/api/ops/banners' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    activeBanners: {
      method: 'GET' as const,
      path: '/api/banners' as const,
      responses: {
        200: z.array(z.any()),
      }
    },
    createBanner: {
      method: 'POST' as const,
      path: '/api/ops/banners' as const,
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
      method: 'PATCH' as const,
      path: '/api/ops/banners/:id' as const,
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
      method: 'DELETE' as const,
      path: '/api/ops/banners/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: {
        200: z.array(z.custom<{
          id: number;
          quantity: number;
          status: string;
          product: typeof products.$inferSelect;
          buyer: { id: number; name: string; email: string };
        }>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
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
