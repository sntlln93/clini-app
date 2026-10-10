import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatusBadge } from '@/features/status-badges/SubscriptionStatusBadge';
import { formatDateTime } from '@/lib/format';
import { GRACE_REASON_LABELS } from '@/lib/labels';
import type { AdminSubscription } from '@/types/subscription';
import type { ReactNode } from 'react';

export function SubscriptionSummaryCard({
    subscription,
}: {
    subscription: AdminSubscription;
}) {
    const rows: Array<[string, ReactNode]> = [
        [
            'Estado',
            <SubscriptionStatusBadge
                key="status"
                status={subscription.status}
            />,
        ],
        [
            'Escritura',
            subscription.restricted ? 'Bloqueada (solo lectura)' : 'Habilitada',
        ],
        [
            'Fin de la gracia',
            subscription.status === 'grace'
                ? `${formatDateTime(subscription.grace_ends_at)}${subscription.grace_days_left !== null ? ` (${subscription.grace_days_left} días)` : ''}`
                : '—',
        ],
        [
            'Motivo de la gracia',
            subscription.grace_reason
                ? GRACE_REASON_LABELS[subscription.grace_reason]
                : '—',
        ],
        ['Último pago', formatDateTime(subscription.last_payment_at)],
        [
            'Último pago rechazado',
            formatDateTime(subscription.last_payment_failed_at),
        ],
        ['Próximo cobro', formatDateTime(subscription.next_payment_at)],
        ['Cancelada', formatDateTime(subscription.cancelled_at)],
        ['Proveedor', subscription.provider],
        [
            'ID en el proveedor',
            <span key="provider-id" className="font-mono text-xs break-all">
                {subscription.provider_subscription_id ?? '—'}
            </span>,
        ],
        ['Creada', formatDateTime(subscription.created_at)],
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Suscripción</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                    {rows.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-2"
                        >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="min-w-0 font-medium tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    );
}
