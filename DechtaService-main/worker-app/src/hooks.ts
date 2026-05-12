import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";
import { api } from "./lib/routes";

export interface AppUser {
  id?: number | string;
  name: string;
  email?: string;
  role: "buyer" | "vendor";
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
}

export interface CatalogItem {
  id: number;
  name: string;
  category: string;
  imageUrl?: string;
}

export interface Order {
  id: number;
  status: "pending" | "completed" | "cancelled" | string;
  quantity: number;
  product: Product;
  buyer: { name: string; email: string };
}

type LoginInput = { email: string; password: string };
type RegisterInput = { name: string; email: string; password: string; role: "buyer" | "vendor" };
type CreateOrderInput = { productId: number; quantity: number };

// ============ AUTH HOOKS ============
export function useAuth() {
  const queryClient = useQueryClient();

  const userQuery = useQuery<AppUser | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      try {
        return await apiClient.auth.me();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => apiClient.auth.login(data),
    onSuccess: (user: AppUser) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => apiClient.auth.register(data),
    onSuccess: (user: AppUser) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.auth.logout();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}

// ============ PRODUCTS HOOKS ============
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => apiClient.products.list(),
  });
}

export function useVendorProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.vendorList.path],
    queryFn: async () => apiClient.products.vendorList(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { catalogItemId: number; price: string }) => apiClient.products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.vendorList.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useCatalogItems() {
  return useQuery<CatalogItem[]>({
    queryKey: [api.ops.catalog.path],
    queryFn: async () => apiClient.ops.catalog(),
  });
}

// ============ ORDERS HOOKS ============
export function useOrders() {
  return useQuery<Order[]>({
    queryKey: [api.orders.list.path],
    queryFn: async () => apiClient.orders.list(),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => apiClient.orders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}
