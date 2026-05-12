import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { api } from "@shared/routes";
import { z } from "zod";

type User = z.infer<typeof api.auth.me.responses[200]>;
type LoginInput = z.infer<typeof api.auth.login.input>;
type RegisterInput = z.infer<typeof api.auth.register.input>;

export function useAuth() {
    const queryClient = useQueryClient();

    const userQuery = useQuery<User | null>({
        queryKey: [api.auth.me.path],
        queryFn: async () => {
            try {
                return await apiClient.auth.me();
            } catch (error) {
                return null;
            }
        },
        retry: false,
        staleTime: Infinity,
    });

    const loginMutation = useMutation({
        mutationFn: async (data: LoginInput) => {
            return await apiClient.auth.login(data);
        },
        onSuccess: (user) => {
            queryClient.setQueryData([api.auth.me.path], user);
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (data: RegisterInput) => {
            return await apiClient.auth.register(data);
        },
        onSuccess: (user) => {
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
