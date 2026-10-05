import { subscriptionEventsQueryOptions } from '@/features/subscription-events/subscription-events-query';

/** The provider log of one subscription, one page at a time (`events_page` in the URL). */
export function subscriptionDetailEventsQueryOptions(
    subscriptionId: number,
    page: number,
) {
    return subscriptionEventsQueryOptions({
        subscription_id: subscriptionId,
        page,
    });
}
