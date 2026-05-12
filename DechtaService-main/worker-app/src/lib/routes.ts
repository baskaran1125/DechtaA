export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteDef {
  path: string;
  method: HttpMethod;
}

export const api = {
  auth: {
    register: { path: "/api/auth/register", method: "POST" as const },
    login: { path: "/api/auth/login", method: "POST" as const },
    logout: { path: "/api/auth/logout", method: "POST" as const },
    me: { path: "/api/auth/me", method: "GET" as const },
  },
  products: {
    list: { path: "/api/products", method: "GET" as const },
    create: { path: "/api/products", method: "POST" as const },
    vendorList: { path: "/api/products/vendor", method: "GET" as const },
  },
  orders: {
    list: { path: "/api/orders", method: "GET" as const },
    create: { path: "/api/orders", method: "POST" as const },
  },
  ops: {
    catalog: { path: "/api/ops/catalog", method: "GET" as const },
  },
};

export function buildUrl(path: string, params: Record<string, string | number> = {}) {
  return path.replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    return encodeURIComponent(String(value ?? ""));
  });
}
