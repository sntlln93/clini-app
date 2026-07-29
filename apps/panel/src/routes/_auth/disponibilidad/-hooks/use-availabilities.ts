import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { Availability } from '@/types/availability';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

type AvailabilitySlotPayload = {
    id?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

function queryKey(membershipId: number) {
    return ['availabilities', membershipId];
}

function toRequestBody(payload: AvailabilitySlotPayload) {
    return {
        day_of_week: payload.dayOfWeek,
        start_time: payload.startTime,
        end_time: payload.endTime,
    };
}

export function availabilitiesQueryOptions(membershipId: number) {
    return queryOptions({
        queryKey: queryKey(membershipId),
        queryFn: () =>
            api
                .get<{ data: Availability[] }>(
                    `/memberships/${membershipId}/availabilities`,
                )
                .then((response) => response.data.data),
    });
}

export function useSaveAvailability(membershipId: number) {
    const queryClient = useQueryClient();
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: (payload: AvailabilitySlotPayload) =>
            payload.id === undefined
                ? api.post(
                      `/memberships/${membershipId}/availabilities`,
                      toRequestBody(payload),
                  )
                : api.patch(
                      `/availabilities/${payload.id}`,
                      toRequestBody(payload),
                  ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey(membershipId) });
            void router.invalidate();
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteAvailability(membershipId: number) {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/availabilities/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey(membershipId) });
            void router.invalidate();
        },
    });
}
