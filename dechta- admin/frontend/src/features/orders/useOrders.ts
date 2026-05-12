import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { api } from "@shared/routes";
import { z } from "zod";

type CreateOrderInput = z.infer<typeof api.orders.create.input>;

export function useOrders() {
    return useQuery({
        queryKey: [api.orders.list.path],
        queryFn: async () => {
            return await apiClient.orders.list();
        },
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateOrderInput) => {
            return await apiClient.orders.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
        },
    });
}
