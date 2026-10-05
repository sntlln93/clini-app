import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStateBadge } from '@/features/status-badges/UserStateBadge';
import { formatDate } from '@/lib/format';
import { MEMBERSHIP_ROLE_LABELS, MEMBERSHIP_STATUS_LABELS } from '@/lib/labels';
import type { OrganizationMember } from '@/types/organization';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';

const columns: ColumnDef<OrganizationMember, unknown>[] = [
    {
        id: 'user',
        header: 'Usuario',
        cell: ({ row }) => (
            <div className="grid min-w-0">
                <Link
                    to="/usuarios/$id"
                    params={{ id: row.original.user.id }}
                    className="truncate font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                    {row.original.user.name}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                    {row.original.user.email}
                </span>
            </div>
        ),
    },
    {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) =>
            row.original.roles
                .map((role) => MEMBERSHIP_ROLE_LABELS[role])
                .join(', '),
    },
    {
        id: 'membership',
        header: 'Membresía',
        cell: ({ row }) => MEMBERSHIP_STATUS_LABELS[row.original.status],
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'account',
        header: 'Cuenta',
        cell: ({ row }) => (
            <UserStateBadge
                blockedAt={row.original.user.blocked_at}
                emailVerifiedAt={row.original.user.email_verified_at}
            />
        ),
    },
    {
        id: 'created_at',
        header: 'Desde',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: { className: 'hidden lg:table-cell whitespace-nowrap' },
    },
];

export function OrganizationMembersCard({
    members,
}: {
    members: OrganizationMember[];
}) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>Miembros</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable
                    columns={columns}
                    data={members}
                    empty={
                        <EmptyState
                            icon={Users}
                            title="Sin miembros"
                            description="Esta organización no tiene miembros."
                        />
                    }
                />
            </CardContent>
        </Card>
    );
}
