import { StatusPill, type StatusTone } from '@/components/StatusPill';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';
import type { SubscriptionStatus } from '@/types/subscription';

const TONES: Record<SubscriptionStatus, StatusTone> = {
    pending: 'info',
    active: 'success',
    grace: 'warning',
    expired: 'danger',
    cancelled: 'neutral',
};

/** `null` = the organization never started a subscription. */
export function SubscriptionStatusBadge({
    status,
}: {
    status: SubscriptionStatus | null;
}) {
    if (status === null) {
        return <StatusPill tone="neutral">Sin suscripción</StatusPill>;
    }

    return (
        <StatusPill tone={TONES[status]}>
            {SUBSCRIPTION_STATUS_LABELS[status]}
        </StatusPill>
    );
}
