import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import { notifyError, notifySuccess } from '@/lib/toast';
import type {
    AvailabilityException,
    AvailabilityExceptionType,
} from '@/types/availability';
import type { QueryClient } from '@tanstack/react-query';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

type AvailabilityExceptionPayload = {
    id?: number;
    membershipId: number | null;
    type: AvailabilityExceptionType;
    startAt: string;
    endAt: string;
    reason: string | null;
    merge?: boolean;
};

function queryKey(membershipId: number | null) {
    return ['availability-exceptions', membershipId];
}

// The reports' occupancy is computed from the published schedule, exceptions included, and the reports
// page reads them only in its loader (#273).
function discardReports(queryClient: QueryClient) {
    discardPageData(queryClient, ['reports']);
}

function toRequestBody(payload: AvailabilityExceptionPayload) {
    return {
        membership_id: payload.membershipId,
        type: payload.type,
        start_at: payload.startAt,
        end_at: payload.endAt,
        reason: payload.reason,
        ...(payload.merge ? { merge: true } : {}),
    };
}

export function availabilityExceptionsQueryOptions(
    membershipId: number | null,
) {
    return queryOptions({
        queryKey: queryKey(membershipId),
        queryFn: () =>
            api
                .get<{ data: AvailabilityException[] }>(
                    '/availability-exceptions',
                    membershipId === null
                        ? undefined
                        : { params: { membership_id: membershipId } },
                )
                .then((response) => response.data.data),
    });
}

export function useSaveAvailabilityException(membershipId: number | null) {
    const refreshPageData = useRefreshPageData();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: AvailabilityExceptionPayload) =>
            payload.id === undefined
                ? api.post('/availability-exceptions', toRequestBody(payload))
                : api.patch(
                      `/availability-exceptions/${payload.id}`,
                      toRequestBody(payload),
                  ),
        // Save errors render inline in the form, so only success toasts here.
        onSuccess: () => {
            discardReports(queryClient);
            return refreshPageData(queryKey(membershipId)).then(() =>
                notifySuccess('Excepción guardada'),
            );
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteAvailabilityException(membershipId: number | null) {
    const refreshPageData = useRefreshPageData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) =>
            api.delete(`/availability-exceptions/${id}`),
        onSuccess: () => {
            discardReports(queryClient);
            return refreshPageData(queryKey(membershipId)).then(() =>
                notifySuccess('Excepción eliminada'),
            );
        },
        onError: (error) =>
            notifyError(error, 'No se pudo eliminar la excepción'),
    });
}
