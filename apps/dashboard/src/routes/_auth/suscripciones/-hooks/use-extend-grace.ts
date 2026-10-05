import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { formatLocalDate } from '@/lib/format';
import { notifySuccess } from '@/lib/toast';
import type { AdminSubscription } from '@/types/subscription';
import { useMutation } from '@tanstack/react-query';

export type GraceExtensionPayload = {
    /** Local `Y-m-d` in the reporting timezone; stored as that day's 23:59:59. */
    grace_ends_on: string;
    note: string | null;
};

export function useExtendGrace(subscriptionId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: (payload: GraceExtensionPayload) =>
            api
                .post<{ data: AdminSubscription }>(
                    `/admin/subscriptions/${subscriptionId}/grace-extension`,
                    payload,
                )
                .then((response) => response.data.data),
        onSuccess: (_, payload) => {
            notifySuccess(
                `Período de gracia extendido hasta el ${formatLocalDate(payload.grace_ends_on)}`,
            );
            // Organizations embed the subscription's status and grace end (list and detail).
            return refresh(
                ['subscriptions'],
                ['organizations'],
                ['audit-logs'],
                ['overview'],
            );
        },
    });
}
