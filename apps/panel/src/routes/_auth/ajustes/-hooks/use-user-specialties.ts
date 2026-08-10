import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { UserSpecialty } from '@/types/professional';
import { queryOptions, useMutation } from '@tanstack/react-query';

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
    const refreshPageData = useRefreshPageData();

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/users/${userId}/specialties`, {
                specialty_id: specialtyId,
            }),
        onSuccess: () =>
            refreshPageData(queryKey(userId)).then(() =>
                notifySuccess('Especialidad asignada'),
            ),
        onError: (error) =>
            notifyError(error, 'No se pudo asignar la especialidad'),
    });

    const remove = useMutation({
        mutationFn: (specialtyId: number) =>
            api.delete(`/users/${userId}/specialties/${specialtyId}`),
        onSuccess: () =>
            refreshPageData(queryKey(userId)).then(() =>
                notifySuccess('Especialidad quitada'),
            ),
        onError: (error) =>
            notifyError(error, 'No se pudo quitar la especialidad'),
    });

    return { assign, remove };
}
