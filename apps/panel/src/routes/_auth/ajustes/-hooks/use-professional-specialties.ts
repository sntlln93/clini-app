import { api } from '@/lib/api';
import type { ProfessionalSpecialty } from '@/types/professional';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function queryKey(membershipId: number) {
    return ['professional-specialties', membershipId];
}

export function useProfessionalSpecialties(membershipId: number) {
    return useQuery({
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

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKey(membershipId) });

    const assign = useMutation({
        mutationFn: (specialtyId: number) =>
            api.post(`/memberships/${membershipId}/specialties`, {
                specialty_id: specialtyId,
            }),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (specialtyId: number) =>
            api.delete(
                `/memberships/${membershipId}/specialties/${specialtyId}`,
            ),
        onSuccess: invalidate,
    });

    return { assign, remove };
}
