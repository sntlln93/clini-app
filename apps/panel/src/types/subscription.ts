export type SubscriptionStatus =
    'pending' | 'active' | 'grace' | 'expired' | 'cancelled';

/**
 * How often it charges (#240): fixed per Mercado Pago subscription, which
 * can't change its frequency, so the other one takes a new checkout.
 */
export type SubscriptionBilling = 'monthly' | 'annual';

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
    /**
     * End of the period an active subscription had already paid when it was
     * cancelled: it stays on Consultorio until then, and on Free after it
     * (#237). Null unless `cancelled`.
     */
    access_ends_at: string | null;
    billing: SubscriptionBilling;
    /** Amount of each charge (a month or a year, by `billing`) last set at Mercado Pago, in whole pesos. */
    amount: number | null;
};
