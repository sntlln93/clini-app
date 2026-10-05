import { api } from '@/lib/api';
import type { AdminSubscription } from '@/types/subscription';
import { queryOptions } from '@tanstack/react-query';

export function subscriptionQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['subscriptions', 'detail', id],
        queryFn: () =>
            api
                .get<{ data: AdminSubscription }>(`/admin/subscriptions/${id}`)
                .then((response) => response.data.data),
    });
}
