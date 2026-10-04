import type { Subscription, SubscriptionStatus } from '@/types/subscription';

/** Shared `GET /subscription` fixture; `restricted` follows the backend rule. */
export function buildSubscription(
    status: SubscriptionStatus,
    overrides: Partial<Subscription> = {},
): Subscription {
    return {
        status,
        restricted: status === 'expired' || status === 'cancelled',
        grace_ends_at: null,
        grace_days_left: null,
        last_payment_at: null,
        last_payment_failed_at: null,
        next_payment_at: null,
        cancelled_at: null,
        ...overrides,
    };
}
