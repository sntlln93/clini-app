import { DataTable } from '@/components/DataTable';
import { SubscriptionStatusBadge } from '@/features/status-badges/SubscriptionStatusBadge';
import { formatDateTime } from '@/lib/format';
import type { AdminSubscription } from '@/types/subscription';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

function graceLabel(subscription: AdminSubscription): string {
    if (subscription.status !== 'grace') {
        return '—';
    }

    const days = subscription.grace_days_left;
    const suffix =
        days === null ? '' : days <= 0 ? ' (vencida)' : ` (${days} días)`;

    return `${formatDateTime(subscription.grace_ends_at)}${suffix}`;
}

const columns: ColumnDef<AdminSubscription, unknown>[] = [
    {
        id: 'organization',
        header: 'Organización',
        cell: ({ row }) => (
            <Link
                to="/suscripciones/$id"
                params={{ id: row.original.id }}
                className="font-medium underline-offset-4 hover:underline focus-visible:underline"
            >
                {row.original.organization.name}
            </Link>
        ),
    },
    {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => (
            <SubscriptionStatusBadge status={row.original.status} />
        ),
    },
    {
        id: 'grace',
        header: 'Fin de la gracia',
        cell: ({ row }) => graceLabel(row.original),
        meta: { className: 'whitespace-nowrap tabular-nums' },
    },
    {
        id: 'last_payment_at',
        header: 'Último pago',
        cell: ({ row }) => formatDateTime(row.original.last_payment_at),
        meta: {
            className: 'hidden md:table-cell whitespace-nowrap tabular-nums',
        },
    },
    {
        id: 'updated_at',
        header: 'Actualizada',
        cell: ({ row }) => formatDateTime(row.original.updated_at),
        meta: {
            className: 'hidden lg:table-cell whitespace-nowrap tabular-nums',
        },
    },
];

export function SubscriptionsTable({
    subscriptions,
    empty,
}: {
    subscriptions: AdminSubscription[];
    empty: ReactNode;
}) {
    return <DataTable columns={columns} data={subscriptions} empty={empty} />;
}
