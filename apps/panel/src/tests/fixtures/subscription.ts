import type { Subscription, SubscriptionStatus } from '@/types/subscription';

/** Shared `GET /subscription` fixture; `restricted` follows the backend rule (a cancelled one with `access_ends_at` ahead isn't restricted). */
export function buildSubscription(
    status: SubscriptionStatus,
    overrides: Partial<Subscription> = {},
): Subscription {
    const accessEndsAt = overrides.access_ends_at ?? null;

    return {
        status,
        restricted:
            status === 'expired' ||
            (status === 'cancelled' &&
                (accessEndsAt === null ||
                    new Date(accessEndsAt).getTime() <= Date.now())),
        grace_ends_at: null,
        grace_days_left: null,
        last_payment_at: null,
        last_payment_failed_at: null,
        next_payment_at: null,
        cancelled_at: null,
        access_ends_at: null,
        ...overrides,
    };
}
