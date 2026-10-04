import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/subscription';
import type { Subscription, SubscriptionStatus } from '@/types/subscription';
import { useStartSubscription } from '../-hooks/use-start-subscription';

type SubscriptionSectionProps = {
    subscription: Subscription | null;
    isOwner: boolean;
};

const BADGE_VARIANTS: Record<
    SubscriptionStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    pending: 'secondary',
    active: 'default',
    grace: 'outline',
    expired: 'destructive',
    cancelled: 'destructive',
};

/** Null when no checkout action applies (an active subscription). */
function actionLabel(subscription: Subscription | null): string | null {
    switch (subscription?.status) {
        case 'active':
            return null;
        case 'grace':
        case 'expired':
            return 'Regularizar pago';
        default:
            return 'Suscribirse';
    }
}

function daysLeftCopy(days: number): string {
    return days === 1
        ? 'Te queda 1 día para regularizar el pago.'
        : `Te quedan ${days} días para regularizar el pago.`;
}

export function SubscriptionSection({
    subscription,
    isOwner,
}: SubscriptionSectionProps) {
    const { mutate, isPending } = useStartSubscription();
    const label = actionLabel(subscription);

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Suscripción</h2>
                <p className="text-sm text-muted-foreground">
                    La suscripción mensual del consultorio se cobra con Mercado
                    Pago.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {subscription ? (
                    <Badge variant={BADGE_VARIANTS[subscription.status]}>
                        {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                    </Badge>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        El consultorio todavía no tiene una suscripción.
                    </p>
                )}

                {label && isOwner && (
                    <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        onClick={() => mutate()}
                    >
                        {label}
                    </Button>
                )}
            </div>

            {subscription?.status === 'grace' &&
                subscription.grace_days_left !== null && (
                    <p className="text-sm text-muted-foreground">
                        {daysLeftCopy(subscription.grace_days_left)}
                    </p>
                )}

            {subscription?.restricted && (
                <p className="text-sm text-muted-foreground">
                    La agenda está en modo solo lectura hasta que se registre el
                    pago.
                </p>
            )}

            {label && !isOwner && (
                <p className="text-sm text-muted-foreground">
                    Solo la persona dueña del consultorio puede gestionar la
                    suscripción.
                </p>
            )}
        </section>
    );
}
