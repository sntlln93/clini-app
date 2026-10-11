import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Availability } from '@/types/availability';
import type { QueryClient } from '@tanstack/react-query';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

type AvailabilitySlotPayload = {
    id?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    merge?: boolean;
};

function queryKey(membershipId: number) {
    return ['availabilities', membershipId];
}

// The reports' occupancy is computed from the published hours, and the reports
// page reads them only in its loader (#273).
function discardReports(queryClient: QueryClient) {
    discardPageData(queryClient, ['reports']);
}

function toRequestBody(payload: AvailabilitySlotPayload) {
    return {
        day_of_week: payload.dayOfWeek,
        start_time: payload.startTime,
        end_time: payload.endTime,
        ...(payload.merge ? { merge: true } : {}),
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
    const queryClient = useQueryClient();

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
        // Save errors render inline in the row's form, so only success toasts here.
        onSuccess: () => {
            discardReports(queryClient);
            return refreshPageData(queryKey(membershipId)).then(() =>
                notifySuccess('Horario guardado'),
            );
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteAvailability(membershipId: number) {
    const refreshPageData = useRefreshPageData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/availabilities/${id}`),
        onSuccess: () => {
            discardReports(queryClient);
            return refreshPageData(queryKey(membershipId)).then(() =>
                notifySuccess('Horario eliminado'),
            );
        },
        onError: (error) =>
            notifyError(error, 'No se pudo eliminar el horario'),
    });
}
