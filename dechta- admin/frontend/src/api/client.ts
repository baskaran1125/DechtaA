import { api, buildUrl } from "@shared/routes";

async function fetchApi<T>(route: any, params?: any, body?: any): Promise<T> {
    const apiPath = buildUrl(route.path, params);
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const url = `${baseUrl}${apiPath}`;
    const response = await fetch(url, {
        method: route.method,
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "An error occurred");
    }

    return response.json();
}

export const apiClient = {
    auth: {
        register: (data: any) => fetchApi(api.auth.register, {}, data),
        login: (data: any) => fetchApi(api.auth.login, {}, data),
        logout: () => fetchApi(api.auth.logout),
        me: () => fetchApi(api.auth.me),
    },
    products: {
        list: () => fetchApi(api.products.list),
        create: (data: any) => fetchApi(api.products.create, {}, data),
        vendorList: () => fetchApi(api.products.vendorList),
    },
    orders: {
        list: () => fetchApi(api.orders.list),
        create: (data: any) => fetchApi(api.orders.create, {}, data),
    },
    ops: {
        stats: () => fetchApi(api.ops.stats),
        catalog: () => fetchApi(api.ops.catalog),
        createCatalogItem: (data: any) => fetchApi(api.ops.createCatalogItem, {}, data),
        pendingProducts: () => fetchApi(api.ops.pendingProducts),
        allProducts: () => fetchApi(api.ops.allProducts),
        approveProduct: (id: number) => fetchApi(api.ops.approveProduct, { id }),
        rejectProduct: (id: number, reason: string) => fetchApi(api.ops.rejectProduct, { id }, { reason }),
    }
};
