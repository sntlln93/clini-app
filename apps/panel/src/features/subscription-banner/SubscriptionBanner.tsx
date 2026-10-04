import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import type { Subscription } from '@/types/subscription';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

type SubscriptionBannerProps = {
    subscription: Subscription | null | undefined;
};

function daysLeftLabel(days: number): string {
    return days === 1 ? 'Te queda 1 día' : `Te quedan ${days} días`;
}

function bannerCopy(
    subscription: Subscription,
): { title: string; description: string } | null {
    switch (subscription.status) {
        case 'grace':
            return {
                title: 'Tu suscripción tiene un pago pendiente.',
                description: `${daysLeftLabel(subscription.grace_days_left ?? 0)} para regularizarlo antes de que la agenda quede en modo solo lectura.`,
            };
        case 'expired':
            return {
                title: 'Suscripción vencida: la agenda está en modo solo lectura.',
                description:
                    'Podés consultar los turnos existentes, pero no crear ni modificar turnos, notas clínicas, recetas ni disponibilidad, ni recibir reservas online, hasta regularizar el pago.',
            };
        case 'cancelled':
            return {
                title: 'Suscripción cancelada: la agenda está en modo solo lectura.',
                description:
                    'Podés consultar los turnos existentes. Volvé a suscribirte para crear o modificar turnos, notas clínicas, recetas y disponibilidad, y para recibir reservas online.',
            };
        default:
            return null;
    }
}

/** Panel-wide notice for a subscription in grace, expired or cancelled; renders nothing otherwise. */
export function SubscriptionBanner({ subscription }: SubscriptionBannerProps) {
    const copy = subscription ? bannerCopy(subscription) : null;

    if (!copy || !subscription) {
        return null;
    }

    return (
        <Alert
            variant={subscription.restricted ? 'destructive' : 'default'}
            className="mb-4 print:hidden"
        >
            <CircleAlert />
            <AlertTitle>{copy.title}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{copy.description}</span>
                <Link
                    to="/ajustes"
                    className={buttonVariants({ size: 'sm', variant: 'link' })}
                >
                    Ver suscripción
                </Link>
            </AlertDescription>
        </Alert>
    );
}
