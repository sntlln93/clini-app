import { api } from '@/lib/api';
import type { UserSpecialty } from '@/types/professional';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function queryKey(userId: number) {
    return ['user-specialties', userId];
}

export function useUserSpecialties(userId: number) {
    return useQuery({
        queryKey: queryKey(userId),
        queryFn: () =>
            api
                .get<{ data: UserSpecialty[] }>(`/users/${userId}/specialties`)
                .then((response) => response.data.data),
    });
}

export function useToggleUserSpecialty(userId: number) {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKey(userId) });

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/users/${userId}/specialties`, {
                specialty_id: specialtyId,
            }),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (specialtyId: number) =>
            api.delete(`/users/${userId}/specialties/${specialtyId}`),
        onSuccess: invalidate,
    });

    return { assign, remove };
}
