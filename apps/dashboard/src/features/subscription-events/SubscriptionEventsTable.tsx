import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { formatDateTime } from '@/lib/format';
import type { SubscriptionEvent } from '@/types/subscription';
import type { ColumnDef } from '@tanstack/react-table';
import { Webhook } from 'lucide-react';
import { EventPayloadDialog } from './EventPayloadDialog';

const columns: ColumnDef<SubscriptionEvent, unknown>[] = [
    {
        id: 'created_at',
        header: 'Fecha',
        cell: ({ row }) => formatDateTime(row.original.created_at),
        meta: { className: 'whitespace-nowrap' },
    },
    {
        id: 'type',
        header: 'Tipo',
        cell: ({ row }) => (
            <span className="font-mono text-xs">
                {row.original.type ?? '—'}
            </span>
        ),
    },
    {
        id: 'resource_id',
        header: 'Recurso',
        cell: ({ row }) => (
            <span className="font-mono text-xs">
                {row.original.resource_id ?? '—'}
            </span>
        ),
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <EventPayloadDialog event={row.original} />,
        meta: { className: 'text-right' },
    },
];

/** "Eventos del proveedor": Mercado Pago notifications received for a subscription/organization. */
export function SubscriptionEventsTable({
    events,
}: {
    events: SubscriptionEvent[];
}) {
    return (
        <DataTable
            columns={columns}
            data={events}
            empty={
                <EmptyState
                    icon={Webhook}
                    title="Sin eventos del proveedor"
                    description="Todavía no llegó ninguna notificación de Mercado Pago."
                />
            }
        />
    );
}
