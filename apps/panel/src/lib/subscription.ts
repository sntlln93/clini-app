import { api } from '@/lib/api';
import type { Subscription, SubscriptionStatus } from '@/types/subscription';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const subscriptionQueryOptions = queryOptions({
    queryKey: ['subscription'],
    queryFn: () =>
        api
            .get<{ data: Subscription | null }>('/subscription')
            .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
});

/**
 * Observes the subscription the `_auth` loader already read into the cache
 * (ADR 0007) — it never fetches by itself, so a component reading it adds
 * no request. `undefined` (not loaded, e.g. no active membership) reads as
 * unrestricted: the backend stays the source of truth for the restriction.
 */
export function useSubscription(): Subscription | null | undefined {
    const { data } = useQuery({ ...subscriptionQueryOptions, enabled: false });

    return data;
}

export function isSubscriptionRestricted(
    subscription: Subscription | null | undefined,
): boolean {
    return subscription?.restricted ?? false;
}

/**
 * Whether the write affordances of the read-only modules (agenda, clinical
 * notes, prescriptions, availability) must be hidden.
 */
export function useSubscriptionRestricted(): boolean {
    return isSubscriptionRestricted(useSubscription());
}

/** Anchor of Ajustes' subscription section, the target of the panel banner's link. */
export const SUBSCRIPTION_SECTION_ID = 'suscripcion';

/**
 * Brings the subscription section into view when it is already rendered
 * (the banner is clicked on Ajustes itself, where a same-URL navigation
 * wouldn't scroll again); a no-op anywhere else.
 */
export function scrollToSubscriptionSection(): void {
    document
        .getElementById(SUBSCRIPTION_SECTION_ID)
        ?.scrollIntoView({ block: 'start' });
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
    pending: 'Pendiente',
    active: 'Activa',
    grace: 'En período de gracia',
    expired: 'Vencida',
    cancelled: 'Cancelada',
};
