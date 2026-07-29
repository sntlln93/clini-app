import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type {
    AvailabilityException,
    AvailabilityExceptionType,
} from '@/types/availability';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

type AvailabilityExceptionPayload = {
    id?: number;
    membershipId: number | null;
    type: AvailabilityExceptionType;
    startAt: string;
    endAt: string;
    reason: string | null;
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
    const queryClient = useQueryClient();
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: (payload: AvailabilityExceptionPayload) =>
            payload.id === undefined
                ? api.post('/availability-exceptions', toRequestBody(payload))
                : api.patch(
                      `/availability-exceptions/${payload.id}`,
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

export function useDeleteAvailabilityException(membershipId: number | null) {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (id: number) =>
            api.delete(`/availability-exceptions/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey(membershipId) });
            void router.invalidate();
        },
    });
}
