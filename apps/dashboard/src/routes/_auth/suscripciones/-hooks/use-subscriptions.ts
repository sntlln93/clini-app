import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type {
    AdminSubscription,
    SubscriptionStatus,
} from '@/types/subscription';
import { queryOptions } from '@tanstack/react-query';

export type SubscriptionsQueryParams = {
    q: string;
    status?: SubscriptionStatus;
    /** URL `grace_within` → API `grace_ending_within_days` (the API then ignores `status`). */
    graceWithin?: number;
    page: number;
};

export function subscriptionsQueryOptions(params: SubscriptionsQueryParams) {
    return queryOptions({
        queryKey: ['subscriptions', 'list', params],
        queryFn: () =>
            api
                .get<Paginated<AdminSubscription>>('/admin/subscriptions', {
                    params: {
                        q: params.q || undefined,
                        status:
                            params.graceWithin === undefined
                                ? params.status
                                : undefined,
                        grace_ending_within_days: params.graceWithin,
                        page: params.page,
                    },
                })
                .then((response) => response.data),
    });
}
