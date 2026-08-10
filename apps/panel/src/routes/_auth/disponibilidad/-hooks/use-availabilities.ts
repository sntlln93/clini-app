import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { Availability } from '@/types/availability';
import { queryOptions, useMutation } from '@tanstack/react-query';

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
    const refreshPageData = useRefreshPageData();

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
        onSuccess: () => refreshPageData(queryKey(membershipId)),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteAvailability(membershipId: number) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/availabilities/${id}`),
        onSuccess: () => refreshPageData(queryKey(membershipId)),
    });
}
