import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatusBadge } from '@/features/status-badges/SubscriptionStatusBadge';
import { formatNumber } from '@/lib/format';
import type { SubscriptionCounts } from '@/types/overview';
import { SUBSCRIPTION_STATUSES } from '@/types/subscription';

/** Organizations per subscription state; the six counts add up to the organization total. */
export function SubscriptionStatusKpi({
    counts,
}: {
    counts: SubscriptionCounts;
}) {
    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground">
                    Suscripciones
                </CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {SUBSCRIPTION_STATUSES.map((status) => (
                        <div
                            key={status}
                            className="flex items-center justify-between gap-2"
                        >
                            <dt>
                                <SubscriptionStatusBadge status={status} />
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {formatNumber(counts[status])}
                            </dd>
                        </div>
                    ))}
                    <div className="flex items-center justify-between gap-2">
                        <dt>
                            <SubscriptionStatusBadge status={null} />
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {formatNumber(counts.none)}
                        </dd>
                    </div>
                </dl>
            </CardContent>
        </Card>
    );
}
