import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { UserSpecialty } from '@/types/professional';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

function queryKey(userId: number) {
    return ['user-specialties', userId];
}

export function userSpecialtiesQueryOptions(userId: number) {
    return queryOptions({
        queryKey: queryKey(userId),
        queryFn: () =>
            api
                .get<{ data: UserSpecialty[] }>(`/users/${userId}/specialties`)
                .then((response) => response.data.data),
    });
}

export function useToggleUserSpecialty(userId: number) {
    const queryClient = useQueryClient();
    const router = useRouter();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: queryKey(userId) });
        void router.invalidate();
    };

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/users/${userId}/specialties`, {
                specialty_id: specialtyId,
            }),
        onSuccess: () => {
            invalidate();
            notifySuccess('Especialidad asignada');
        },
        onError: (error) =>
            notifyError(error, 'No se pudo asignar la especialidad'),
    });

    const remove = useMutation({
        mutationFn: (specialtyId: number) =>
            api.delete(`/users/${userId}/specialties/${specialtyId}`),
        onSuccess: () => {
            invalidate();
            notifySuccess('Especialidad quitada');
        },
        onError: (error) =>
            notifyError(error, 'No se pudo quitar la especialidad'),
    });

    return { assign, remove };
}
