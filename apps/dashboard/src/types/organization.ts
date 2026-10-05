import type { MembershipRole, MembershipStatus, UserRef } from './admin';
import type { AdminSubscription, SubscriptionStatus } from './subscription';

/** Contract §3.4 — list item. */
export type AdminOrganization = {
    id: number;
    name: string;
    slug: string;
    timezone: string;
    created_at: string;
    suspended_at: string | null;
    suspension_reason: string | null;
    active_members_count: number;
    subscription: {
        status: SubscriptionStatus;
        grace_ends_at: string | null;
    } | null;
};

export type OrganizationMember = {
    membership_id: number;
    user: UserRef & {
        blocked_at: string | null;
        email_verified_at: string | null;
    };
    roles: MembershipRole[];
    status: MembershipStatus;
    created_at: string;
};

export type OrganizationUsage = {
    patients: number;
    professionals: number;
    appointments_total: number;
    appointments_last_30_days: number;
    appointments_upcoming: number;
    last_appointment_created_at: string | null;
};

/** Contract §3.4 — detail; the full subscription replaces the list's mini shape. */
export type AdminOrganizationDetail = Omit<
    AdminOrganization,
    'subscription'
> & {
    members: OrganizationMember[];
    subscription: AdminSubscription | null;
    usage: OrganizationUsage;
};

export const ORGANIZATION_STATE_FILTERS = ['active', 'suspended'] as const;
export type OrganizationStateFilter =
    (typeof ORGANIZATION_STATE_FILTERS)[number];

export const ORGANIZATION_SUBSCRIPTION_FILTERS = [
    'none',
    'pending',
    'active',
    'grace',
    'expired',
    'cancelled',
] as const;
export type OrganizationSubscriptionFilter =
    (typeof ORGANIZATION_SUBSCRIPTION_FILTERS)[number];
