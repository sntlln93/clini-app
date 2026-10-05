import type { OrganizationRef } from './admin';

export const SUBSCRIPTION_STATUSES = [
    'pending',
    'active',
    'grace',
    'expired',
    'cancelled',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const GRACE_REASONS = ['payment_failed', 'paused'] as const;
export type GraceReason = (typeof GRACE_REASONS)[number];

/** Contract §3.6. */
export type AdminSubscription = {
    id: number;
    organization: OrganizationRef;
    provider: string;
    provider_subscription_id: string | null;
    status: SubscriptionStatus;
    restricted: boolean;
    grace_ends_at: string | null;
    grace_days_left: number | null;
    grace_reason: GraceReason | null;
    last_payment_at: string | null;
    last_payment_failed_at: string | null;
    next_payment_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
};

/** Contract §3.7 — the provider's webhook log. */
export type SubscriptionEvent = {
    id: number;
    provider: string;
    notification_id: string;
    type: string | null;
    resource_id: string | null;
    subscription_id: number | null;
    organization: { id: number; name: string } | null;
    payload: Record<string, unknown>;
    created_at: string;
};
