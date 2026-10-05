import { DataTable } from '@/components/DataTable';
import { UserStateBadge } from '@/features/status-badges/UserStateBadge';
import { formatDate, formatNumber } from '@/lib/format';
import type { AdminUser } from '@/types/user';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

const columns: ColumnDef<AdminUser, unknown>[] = [
    {
        accessorKey: 'name',
        header: 'Usuario',
        cell: ({ row }) => (
            <div className="grid min-w-0">
                <Link
                    to="/usuarios/$id"
                    params={{ id: row.original.id }}
                    className="truncate font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                    {row.original.name}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                    {row.original.email}
                </span>
            </div>
        ),
    },
    {
        id: 'state',
        header: 'Estado',
        cell: ({ row }) => (
            <UserStateBadge
                blockedAt={row.original.blocked_at}
                emailVerifiedAt={row.original.email_verified_at}
            />
        ),
    },
    {
        id: 'memberships',
        header: 'Organizaciones',
        cell: ({ row }) => formatNumber(row.original.memberships_count),
        meta: { className: 'hidden md:table-cell tabular-nums' },
    },
    {
        id: 'created_at',
        header: 'Alta',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: { className: 'hidden lg:table-cell whitespace-nowrap' },
    },
];

export function UsersTable({
    users,
    empty,
}: {
    users: AdminUser[];
    empty: ReactNode;
}) {
    return <DataTable columns={columns} data={users} empty={empty} />;
}
