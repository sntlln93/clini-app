import { api } from '@/lib/api';
import { DateTime, fromInstant } from '@/lib/datetime';
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

/** e.g. «3 de noviembre de 2026». */
export function formatSubscriptionDate(iso: string): string {
    return fromInstant(iso).toLocaleString({
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Statuses whose provider subscription can still charge, so the owner can
 * cancel it (`DELETE /subscription`); the API answers 409 for the rest.
 */
export function isSubscriptionCancellable(
    subscription: Subscription | null,
): subscription is Subscription {
    return (
        subscription?.status === 'active' ||
        subscription?.status === 'grace' ||
        subscription?.status === 'expired'
    );
}

/**
 * Until when cancelling right now keeps the agenda writable: an active
 * subscription's renewal date, if still ahead — the API's own rule, used here
 * for copy only. Null when cancelling makes it read-only right away.
 */
export function paidPeriodEnd(
    subscription: Subscription,
    now: DateTime = DateTime.now(),
): string | null {
    const renewal = subscription.next_payment_at;

    return subscription.status === 'active' &&
        renewal !== null &&
        fromInstant(renewal) > now
        ? renewal
        : null;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
    pending: 'Pendiente',
    active: 'Activa',
    grace: 'En período de gracia',
    expired: 'Vencida',
    cancelled: 'Cancelada',
};
