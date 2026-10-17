import { DataTable } from '@/components/DataTable';
import { ContactRequestStatusBadge } from '@/features/status-badges/ContactRequestStatusBadge';
import { formatDateTime } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/labels';
import type { AdminContactRequest } from '@/types/contact-request';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, type ReactNode } from 'react';
import {
    ContactRequestDialog,
    type ContactRequestDialogProps,
} from './ContactRequestDialog';

type DialogFocus = Pick<
    ContactRequestDialogProps,
    'isListed' | 'fallbackFocus'
>;

function contactRequestColumns(
    focus: DialogFocus,
): ColumnDef<AdminContactRequest, unknown>[] {
    return [
        {
            accessorKey: 'name',
            header: 'Contacto',
            cell: ({ row }) => (
                <div className="grid min-w-0">
                    <span className="truncate font-medium">
                        {row.original.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        {row.original.email}
                    </span>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: ({ row }) => (
                <ContactRequestStatusBadge status={row.original.status} />
            ),
        },
        {
            id: 'organization',
            header: 'Consultorio o centro',
            cell: ({ row }) => row.original.organization_name ?? '—',
            meta: { className: 'hidden md:table-cell' },
        },
        {
            id: 'plan',
            header: 'Plan',
            cell: ({ row }) =>
                row.original.plan === null
                    ? '—'
                    : PLAN_LABELS[row.original.plan],
            meta: { className: 'hidden lg:table-cell' },
        },
        {
            id: 'created_at',
            header: 'Recibida',
            cell: ({ row }) => formatDateTime(row.original.created_at),
            meta: {
                className:
                    'hidden sm:table-cell whitespace-nowrap tabular-nums',
            },
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Acciones</span>,
            cell: ({ row }) => (
                <ContactRequestDialog
                    contactRequest={row.original}
                    {...focus}
                />
            ),
            meta: { className: 'text-right' },
        },
    ];
}

export function ContactRequestsTable({
    contactRequests,
    empty,
    isListed,
    fallbackFocus,
}: {
    contactRequests: AdminContactRequest[];
    empty: ReactNode;
} & DialogFocus) {
    const columns = useMemo(
        () => contactRequestColumns({ isListed, fallbackFocus }),
        [isListed, fallbackFocus],
    );

    return <DataTable columns={columns} data={contactRequests} empty={empty} />;
}
