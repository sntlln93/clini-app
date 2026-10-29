import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { ProfessionalSpecialty } from '@/types/professional';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

function queryKey(membershipId: number) {
    return ['professional-specialties', membershipId];
}

export function professionalSpecialtiesQueryOptions(membershipId: number) {
    return queryOptions({
        queryKey: queryKey(membershipId),
        queryFn: () =>
            api
                .get<{ data: ProfessionalSpecialty[] }>(
                    `/memberships/${membershipId}/specialties`,
                )
                .then((response) => response.data.data),
    });
}

export function useToggleProfessionalSpecialty(membershipId: number) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    // The member cards list each professional's specialties (#306), and only
    // their loader reads them (#273).
    function refresh() {
        discardPageData(queryClient, ['memberships', 'cards']);

        return refreshPageData(queryKey(membershipId));
    }

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/memberships/${membershipId}/specialties`, {
                specialty_id: specialtyId,
            }),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Especialidad asignada')),
        onError: (error) =>
            notifyError(error, 'No se pudo asignar la especialidad'),
    });

    const remove = useMutation({
        mutationFn: (specialtyId: number) =>
            api.delete(
                `/memberships/${membershipId}/specialties/${specialtyId}`,
            ),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Especialidad quitada')),
        onError: (error) =>
            notifyError(error, 'No se pudo quitar la especialidad'),
    });

    return { assign, remove };
}
