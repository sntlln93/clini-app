import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import {
    SUBSCRIPTION_SECTION_ID,
    formatSubscriptionDate,
    scrollToSubscriptionSection,
} from '@/lib/subscription';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

type SubscriptionBannerProps = {
    subscription: Subscription | null | undefined;
    plan: Plan | undefined;
    now?: Date;
};

type BannerCopy = { title: string; description: string; restricted: boolean };

function daysLeftLabel(days: number): string {
    return days === 1 ? 'Te queda 1 día' : `Te quedan ${days} días`;
}

function subscriptionCopy(
    subscription: Subscription,
    now: Date,
): BannerCopy | null {
    switch (subscription.status) {
        case 'grace':
            return {
                title: 'Tu suscripción tiene un pago pendiente.',
                description: `${daysLeftLabel(subscription.grace_days_left ?? 0)} para regularizarlo antes de que la agenda quede en modo solo lectura.`,
                restricted: false,
            };
        case 'expired':
            return {
                title: 'Suscripción vencida: la agenda está en modo solo lectura.',
                description:
                    'Podés consultar los turnos existentes, pero no crear ni modificar turnos, notas clínicas, recetas ni disponibilidad, ni recibir reservas online, hasta regularizar el pago.',
                restricted: true,
            };
        case 'cancelled':
            // Only while the period it had already paid lasts; after it the organization is on Free.
            if (
                subscription.access_ends_at &&
                new Date(subscription.access_ends_at).getTime() > now.getTime()
            ) {
                return {
                    title: 'Cancelaste la suscripción.',
                    description: `Seguís en el plan Consultorio hasta el ${formatSubscriptionDate(subscription.access_ends_at)}. Después tu consultorio pasa al plan Gratis, salvo que vuelvas a suscribirte.`,
                    restricted: false,
                };
            }

            return null;
        default:
            return null;
    }
}

function planCopy(plan: Plan): BannerCopy | null {
    if (!plan.restricted) {
        return null;
    }

    return {
        title: `El plan Gratis incluye ${plan.professional_limit === 1 ? 'un solo profesional activo' : `${plan.professional_limit} profesionales activos`} y tu consultorio tiene ${plan.active_professionals}.`,
        description:
            'La agenda queda en modo solo lectura hasta que pases a Consultorio o desactives profesionales.',
        restricted: true,
    };
}

/** Panel-wide notice for a subscription in grace, expired or within the paid period of a cancellation, or for more active professionals than the plan allows; renders nothing otherwise. */
export function SubscriptionBanner({
    subscription,
    plan,
    now = new Date(),
}: SubscriptionBannerProps) {
    const fromSubscription = subscription
        ? subscriptionCopy(subscription, now)
        : null;
    const copy =
        fromSubscription?.restricted || !plan
            ? fromSubscription
            : (planCopy(plan) ?? fromSubscription);

    if (!copy) {
        return null;
    }

    return (
        <Alert
            variant={copy.restricted ? 'destructive' : 'default'}
            className="mb-4 print:hidden"
        >
            <CircleAlert />
            <AlertTitle>{copy.title}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{copy.description}</span>
                <Link
                    to="/ajustes"
                    hash={SUBSCRIPTION_SECTION_ID}
                    onClick={scrollToSubscriptionSection}
                    className={buttonVariants({ size: 'sm', variant: 'link' })}
                >
                    Ver plan
                </Link>
            </AlertDescription>
        </Alert>
    );
}
