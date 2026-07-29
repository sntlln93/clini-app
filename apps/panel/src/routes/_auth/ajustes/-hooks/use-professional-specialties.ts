import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { ProfessionalSpecialty } from '@/types/professional';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

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
    const router = useRouter();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: queryKey(membershipId) });
        void router.invalidate();
    };

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/memberships/${membershipId}/specialties`, {
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
            api.delete(
                `/memberships/${membershipId}/specialties/${specialtyId}`,
            ),
        onSuccess: () => {
            invalidate();
            notifySuccess('Especialidad quitada');
        },
        onError: (error) =>
            notifyError(error, 'No se pudo quitar la especialidad'),
    });

    return { assign, remove };
}
