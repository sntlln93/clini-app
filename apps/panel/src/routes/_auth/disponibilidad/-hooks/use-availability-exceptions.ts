import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type {
    AvailabilityException,
    AvailabilityExceptionType,
} from '@/types/availability';
import { queryOptions, useMutation } from '@tanstack/react-query';

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

    const mutation = useMutation({
        mutationFn: (payload: AvailabilityExceptionPayload) =>
            payload.id === undefined
                ? api.post('/availability-exceptions', toRequestBody(payload))
                : api.patch(
                      `/availability-exceptions/${payload.id}`,
                      toRequestBody(payload),
                  ),
        onSuccess: () => refreshPageData(queryKey(membershipId)),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteAvailabilityException(membershipId: number | null) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (id: number) =>
            api.delete(`/availability-exceptions/${id}`),
        onSuccess: () => refreshPageData(queryKey(membershipId)),
    });
}
