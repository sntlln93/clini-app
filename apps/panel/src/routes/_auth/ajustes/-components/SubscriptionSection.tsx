import { StatusPill, type StatusTone } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DateTime } from '@/lib/datetime';
import {
    SUBSCRIPTION_SECTION_ID,
    SUBSCRIPTION_STATUS_LABELS,
    isSubscriptionCancellable,
} from '@/lib/subscription';
import type { Plan } from '@/types/plan';
import type {
    Subscription,
    SubscriptionBilling,
    SubscriptionStatus,
} from '@/types/subscription';
import { useState } from 'react';
import { useStartSubscription } from '../-hooks/use-start-subscription';
import { BillingChoice } from './BillingChoice';
import { CancelSubscriptionButton } from './CancelSubscriptionButton';
import { PlanSummary } from './PlanSummary';
import {
    lastPaymentDetail,
    subscriptionStatusDetail,
} from './subscription-copy';

type SubscriptionSectionProps = {
    subscription: Subscription | null;
    /** Undefined when it couldn't be read: the section falls back to the subscription alone. */
    plan: Plan | undefined;
    isOwner: boolean;
    /** Back from the checkout, waiting for the provider to confirm the payment. */
    confirmingPayment?: boolean;
};

const STATUS_TONES: Record<SubscriptionStatus, StatusTone> = {
    pending: 'info',
    active: 'success',
    grace: 'warning',
    expired: 'danger',
    cancelled: 'neutral',
};

/** Null when no checkout action applies: an active subscription, or Centro, billed outside the panel. */
function actionLabel(
    subscription: Subscription | null,
    plan: Plan | undefined,
): string | null {
    if (plan?.plan === 'center') {
        return null;
    }

    switch (subscription?.status) {
        case 'active':
            return null;
        case 'grace':
        case 'expired':
            return 'Regularizar pago';
        default:
            return 'Pasar a Consultorio';
    }
}

/**
 * Grace regularizes the Mercado Pago subscription it has, so its billing
 * stays; every other checkout creates a new one, whose billing the owner
 * picks (#240).
 */
function offersBillingChoice(subscription: Subscription | null): boolean {
    return subscription?.status !== 'grace';
}

export function SubscriptionSection({
    subscription,
    plan,
    isOwner,
    confirmingPayment = false,
}: SubscriptionSectionProps) {
    const { start, isRedirecting } = useStartSubscription();
    const label = actionLabel(subscription, plan);
    const [billing, setBilling] = useState<SubscriptionBilling>(
        subscription?.billing ?? 'monthly',
    );
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
                    Plan y suscripción
                </h2>
                <p className="text-sm text-muted-foreground">
                    El plan define qué funciones tiene el consultorio. El plan
                    Consultorio se cobra con Mercado Pago, todos los meses o una
                    vez por año.
                </p>
            </div>

            {plan && <PlanSummary plan={plan} subscription={subscription} />}

            {label && isOwner && plan && offersBillingChoice(subscription) && (
                <BillingChoice
                    plan={plan}
                    value={billing}
                    onValueChange={setBilling}
                    disabled={isRedirecting}
                />
            )}

            <div className="flex flex-wrap items-center gap-3">
                {subscription ? (
                    <StatusPill tone={STATUS_TONES[subscription.status]}>
                        {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                    </StatusPill>
                ) : (
                    !plan && (
                        <p className="text-sm text-muted-foreground">
                            El consultorio todavía no tiene una suscripción.
                        </p>
                    )
                )}

                {label && isOwner && (
                    <Button
                        type="button"
                        size="sm"
                        disabled={isRedirecting}
                        onClick={() => start(billing)}
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

                {isOwner && isSubscriptionCancellable(subscription) && (
                    <CancelSubscriptionButton subscription={subscription} />
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
                    <p>
                        {subscriptionStatusDetail(
                            subscription,
                            DateTime.now(),
                            plan?.assigned_by_platform ?? false,
                        )}
                    </p>
                    {lastPayment && <p>{lastPayment}</p>}
                </div>
            )}

            {subscription?.restricted && (
                <p className="text-sm text-muted-foreground">
                    La agenda está en modo solo lectura hasta que se registre el
                    pago.
                </p>
            )}

            {(label || isSubscriptionCancellable(subscription)) && !isOwner && (
                <p className="text-sm text-muted-foreground">
                    Solo la persona dueña del consultorio puede gestionar la
                    suscripción.
                </p>
            )}
        </section>
    );
}
