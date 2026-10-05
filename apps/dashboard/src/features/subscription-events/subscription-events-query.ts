import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { SubscriptionEvent } from '@/types/subscription';
import { queryOptions } from '@tanstack/react-query';

export type SubscriptionEventParams = {
    subscription_id?: number;
    organization_id?: number;
    type?: string;
    page?: number;
    per_page?: number;
};

/** `GET /admin/subscription-events` — the payment provider's webhook log. */
export function subscriptionEventsQueryOptions(
    params: SubscriptionEventParams,
) {
    return queryOptions({
        queryKey: ['subscription-events', params],
        queryFn: () =>
            api
                .get<Paginated<SubscriptionEvent>>(
                    '/admin/subscription-events',
                    {
                        params,
                    },
                )
                .then((response) => response.data),
    });
}
