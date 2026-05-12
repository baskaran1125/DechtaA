import { api, buildUrl, type RouteDef } from "./lib/routes";

const WORKER_API_ORIGIN = (
  import.meta.env.VITE_WORKER_API_URL || import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

async function fetchApi<T>(
  route: RouteDef,
  params: Record<string, string | number> = {},
  body?: unknown
): Promise<T> {
  const apiPath = buildUrl(route.path, params);
  const url = `${WORKER_API_ORIGIN}${apiPath}`;

  const response = await fetch(url, {
    method: route.method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "An error occurred";
    throw new Error(message);
  }

  return payload as T;
}

export const apiClient = {
  auth: {
    register: (data: { name: string; email: string; password: string; role: "buyer" | "vendor" }) =>
      fetchApi<any>(api.auth.register, {}, data),
    login: (data: { email: string; password: string }) => fetchApi<any>(api.auth.login, {}, data),
    logout: () => fetchApi<void>(api.auth.logout),
    me: () => fetchApi<any>(api.auth.me),
  },
  products: {
    list: () => fetchApi<any[]>(api.products.list),
    create: (data: { catalogItemId: number; price: string }) => fetchApi<any>(api.products.create, {}, data),
    vendorList: () => fetchApi<any[]>(api.products.vendorList),
  },
  orders: {
    list: () => fetchApi<any[]>(api.orders.list),
    create: (data: { productId: number; quantity: number }) => fetchApi<any>(api.orders.create, {}, data),
  },
  ops: {
    catalog: () => fetchApi<any[]>(api.ops.catalog),
  },
};
