import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';
import type { SubscriptionStatus } from '@/types/subscription';

const VARIANTS: Record<
    SubscriptionStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    pending: 'outline',
    active: 'default',
    grace: 'secondary',
    expired: 'destructive',
    cancelled: 'outline',
};

/** `null` = the organization never started a subscription. */
export function SubscriptionStatusBadge({
    status,
}: {
    status: SubscriptionStatus | null;
}) {
    if (status === null) {
        return <Badge variant="outline">Sin suscripción</Badge>;
    }

    return (
        <Badge variant={VARIANTS[status]}>
            {SUBSCRIPTION_STATUS_LABELS[status]}
        </Badge>
    );
}
