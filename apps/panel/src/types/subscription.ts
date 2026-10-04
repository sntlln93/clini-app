export type SubscriptionStatus =
    'pending' | 'active' | 'grace' | 'expired' | 'cancelled';

/** GET /subscription's `data`; null for an organization that never subscribed. */
export type Subscription = {
    status: SubscriptionStatus;
    restricted: boolean;
    grace_ends_at: string | null;
    grace_days_left: number | null;
    last_payment_at: string | null;
    last_payment_failed_at: string | null;
    /** The provider's next scheduled charge: the renewal date. */
    next_payment_at: string | null;
    /** When the subscription was cancelled; null unless `cancelled`. */
    cancelled_at: string | null;
};
