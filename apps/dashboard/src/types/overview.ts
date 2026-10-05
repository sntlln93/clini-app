import type { AuditSubjectType } from './audit';

export const OVERVIEW_PERIODS = [7, 30, 90] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export const ACTIVITY_KINDS = [
    'organization_created',
    'user_registered',
    'subscription_event',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type SubscriptionCounts = {
    none: number;
    pending: number;
    active: number;
    grace: number;
    expired: number;
    cancelled: number;
};

export type OverviewKpis = {
    organizations: { total: number; suspended: number; new_in_period: number };
    users: {
        total: number;
        verified: number;
        blocked: number;
        new_in_period: number;
    };
    patients: { total: number; new_in_period: number };
    appointments: {
        total: number;
        created_in_period: number;
        upcoming: number;
    };
    subscriptions: SubscriptionCounts;
    mrr: {
        amount: number;
        currency: string;
        paying_subscriptions: number;
        plan_amount: number;
    };
};

export type OverviewSeriesPoint = {
    date: string;
    organizations: number;
    users: number;
    appointments: number;
};

export type RecentActivity = {
    kind: ActivityKind;
    occurred_at: string;
    subject: { type: AuditSubjectType; id: number; label: string };
    detail: string | null;
};

/** Contract §3.3. */
export type PlatformOverview = {
    kpis: OverviewKpis;
    series: {
        from: string;
        to: string;
        timezone: string;
        points: OverviewSeriesPoint[];
    };
    recent_activity: RecentActivity[];
};
