import { formatSubscriptionDate } from '@/lib/subscription';
import type { Subscription } from '@/types/subscription';

function daysLeft(days: number): string {
    return days === 1 ? 'te queda 1 día' : `te quedan ${days} días`;
}

function graceDetail(subscription: Subscription): string {
    const days = daysLeft(subscription.grace_days_left ?? 0);

    return subscription.grace_ends_at
        ? `Pago pendiente: ${days} (hasta el ${formatSubscriptionDate(subscription.grace_ends_at)})`
        : `Pago pendiente: ${days}`;
}

function cancelledDetail(
    subscription: Subscription,
    now: Date,
    assignedByPlatform: boolean,
): string {
    const cancelled = subscription.cancelled_at
        ? `Cancelada el ${formatSubscriptionDate(subscription.cancelled_at)}`
        : 'Suscripción cancelada';

    // Still within the period it had already paid when it was cancelled;
    // after it the organization is on Free — unless Centro is assigned.
    return !assignedByPlatform &&
        subscription.access_ends_at &&
        new Date(subscription.access_ends_at).getTime() > now.getTime()
        ? `${cancelled}. Seguís en el plan Consultorio hasta el ${formatSubscriptionDate(subscription.access_ends_at)}.`
        : cancelled;
}

/** One line describing where the subscription stands, with its relevant date. */
export function subscriptionStatusDetail(
    subscription: Subscription,
    now: Date = new Date(),
    assignedByPlatform: boolean = false,
): string {
    switch (subscription.status) {
        case 'active':
            return subscription.next_payment_at
                ? `Se renueva automáticamente el ${formatSubscriptionDate(subscription.next_payment_at)}`
                : 'Suscripción activa';
        case 'grace':
            return graceDetail(subscription);
        case 'expired':
            // An expiry keeps the grace_ends_at that caused it.
            return subscription.grace_ends_at
                ? `Venció el ${formatSubscriptionDate(subscription.grace_ends_at)}`
                : 'Suscripción vencida';
        case 'cancelled':
            return cancelledDetail(subscription, now, assignedByPlatform);
        case 'pending':
            return 'Esperando confirmación del pago';
    }
}

export function lastPaymentDetail(subscription: Subscription): string | null {
    return subscription.last_payment_at
        ? `Último pago: ${formatSubscriptionDate(subscription.last_payment_at)}`
        : null;
}
