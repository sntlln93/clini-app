import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    SUBSCRIPTION_SECTION_ID,
    SUBSCRIPTION_STATUS_LABELS,
} from '@/lib/subscription';
import type { Subscription, SubscriptionStatus } from '@/types/subscription';
import { useStartSubscription } from '../-hooks/use-start-subscription';
import {
    lastPaymentDetail,
    subscriptionStatusDetail,
} from './subscription-copy';

type SubscriptionSectionProps = {
    subscription: Subscription | null;
    isOwner: boolean;
    /** Back from the checkout, waiting for the provider to confirm the payment. */
    confirmingPayment?: boolean;
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

export function SubscriptionSection({
    subscription,
    isOwner,
    confirmingPayment = false,
}: SubscriptionSectionProps) {
    const { start, isRedirecting } = useStartSubscription();
    const label = actionLabel(subscription);
    const lastPayment = subscription ? lastPaymentDetail(subscription) : null;

    return (
        <section
            id={SUBSCRIPTION_SECTION_ID}
            aria-labelledby={`${SUBSCRIPTION_SECTION_ID}-title`}
            className="scroll-mt-4 space-y-3"
        >
            <div className="space-y-1">
                <h2
                    id={`${SUBSCRIPTION_SECTION_ID}-title`}
                    className="text-sm font-medium"
                >
                    Suscripción
                </h2>
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
                        disabled={isRedirecting}
                        onClick={start}
                    >
                        {isRedirecting ? (
                            <>
                                <Spinner data-icon="inline-start" aria-hidden />
                                Redirigiendo a Mercado Pago…
                            </>
                        ) : (
                            label
                        )}
                    </Button>
                )}
            </div>

            {confirmingPayment && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                    <Spinner aria-hidden />
                    Estamos confirmando tu pago con Mercado Pago…
                </p>
            )}

            {subscription && (
                <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{subscriptionStatusDetail(subscription)}</p>
                    {lastPayment && <p>{lastPayment}</p>}
                </div>
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
