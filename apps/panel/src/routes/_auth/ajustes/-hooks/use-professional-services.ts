import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { ProfessionalService } from '@/types/professional';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ProfessionalServicePayload = {
    serviceId: number;
    durationMinutes: number;
    priceCents: number | null;
    active: boolean;
};

function queryKey(membershipId: number) {
    return ['professional-services', membershipId];
}

function toRequestBody(payload: ProfessionalServicePayload) {
    return {
        service_id: payload.serviceId,
        duration_minutes: payload.durationMinutes,
        price_cents: payload.priceCents,
        active: payload.active,
    };
}

export function useProfessionalServices(membershipId: number) {
    return useQuery({
        queryKey: queryKey(membershipId),
        queryFn: () =>
            api
                .get<{ data: ProfessionalService[] }>(
                    `/memberships/${membershipId}/services`,
                )
                .then((response) => response.data.data),
    });
}

export function useAssignProfessionalService(membershipId: number) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: ProfessionalServicePayload) =>
            api.post(
                `/memberships/${membershipId}/services`,
                toRequestBody(payload),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKey(membershipId),
            });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateProfessionalService(membershipId: number) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: ProfessionalServicePayload) =>
            api.patch(
                `/memberships/${membershipId}/services/${payload.serviceId}`,
                toRequestBody(payload),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKey(membershipId),
            });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useRemoveProfessionalService(membershipId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (serviceId: number) =>
            api.delete(`/memberships/${membershipId}/services/${serviceId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKey(membershipId),
            });
        },
    });
}
