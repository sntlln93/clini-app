import { DataTable } from '@/components/DataTable';
import { OrganizationStateBadge } from '@/features/status-badges/OrganizationStateBadge';
import { SubscriptionStatusBadge } from '@/features/status-badges/SubscriptionStatusBadge';
import { formatDate, formatNumber } from '@/lib/format';
import type { AdminOrganization } from '@/types/organization';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

const columns: ColumnDef<AdminOrganization, unknown>[] = [
    {
        accessorKey: 'name',
        header: 'Organización',
        cell: ({ row }) => (
            <div className="grid min-w-0">
                <Link
                    to="/organizaciones/$id"
                    params={{ id: row.original.id }}
                    className="truncate font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                    {row.original.name}
                </Link>
                <span className="truncate font-mono text-xs text-muted-foreground">
                    {row.original.slug}
                </span>
            </div>
        ),
    },
    {
        id: 'state',
        header: 'Estado',
        cell: ({ row }) => (
            <OrganizationStateBadge suspendedAt={row.original.suspended_at} />
        ),
    },
    {
        id: 'subscription',
        header: 'Suscripción',
        cell: ({ row }) => (
            <SubscriptionStatusBadge
                status={row.original.subscription?.status ?? null}
            />
        ),
    },
    {
        id: 'members',
        header: 'Miembros activos',
        cell: ({ row }) => formatNumber(row.original.active_members_count),
        meta: { className: 'hidden md:table-cell tabular-nums' },
    },
    {
        id: 'created_at',
        header: 'Alta',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: {
            className: 'hidden lg:table-cell whitespace-nowrap tabular-nums',
        },
    },
];

type OrganizationsTableProps = {
    organizations: AdminOrganization[];
    empty: ReactNode;
};

export function OrganizationsTable({
    organizations,
    empty,
}: OrganizationsTableProps) {
    return <DataTable columns={columns} data={organizations} empty={empty} />;
}
