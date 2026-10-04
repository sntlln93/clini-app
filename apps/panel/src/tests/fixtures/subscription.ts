import type { Subscription, SubscriptionStatus } from '@/types/subscription';

/** Shared `GET /subscription` fixture; `restricted` follows the backend rule. */
export function buildSubscription(status: SubscriptionStatus): Subscription {
    return {
        status,
        restricted: status === 'expired' || status === 'cancelled',
        grace_ends_at: null,
        grace_days_left: null,
        last_payment_at: null,
        last_payment_failed_at: null,
    };
}
