import type { Subscription } from '@/types/subscription';

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** e.g. «3 de noviembre de 2026». */
export function formatSubscriptionDate(iso: string): string {
    return DATE_FORMAT.format(new Date(iso));
}

function daysLeft(days: number): string {
    return days === 1 ? 'te queda 1 día' : `te quedan ${days} días`;
}

function graceDetail(subscription: Subscription): string {
    const days = daysLeft(subscription.grace_days_left ?? 0);

    return subscription.grace_ends_at
        ? `Pago pendiente: ${days} (hasta el ${formatSubscriptionDate(subscription.grace_ends_at)})`
        : `Pago pendiente: ${days}`;
}

/** One line describing where the subscription stands, with its relevant date. */
export function subscriptionStatusDetail(subscription: Subscription): string {
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
            return subscription.cancelled_at
                ? `Cancelada el ${formatSubscriptionDate(subscription.cancelled_at)}`
                : 'Suscripción cancelada';
        case 'pending':
            return 'Esperando confirmación del pago';
    }
}

export function lastPaymentDetail(subscription: Subscription): string | null {
    return subscription.last_payment_at
        ? `Último pago: ${formatSubscriptionDate(subscription.last_payment_at)}`
        : null;
}
