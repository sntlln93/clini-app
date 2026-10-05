import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationStateBadge } from '@/features/status-badges/OrganizationStateBadge';
import { formatDate } from '@/lib/format';
import { MEMBERSHIP_ROLE_LABELS, MEMBERSHIP_STATUS_LABELS } from '@/lib/labels';
import type { UserMembership } from '@/types/user';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';

const columns: ColumnDef<UserMembership, unknown>[] = [
    {
        id: 'organization',
        header: 'Organización',
        cell: ({ row }) => (
            <Link
                to="/organizaciones/$id"
                params={{ id: row.original.organization.id }}
                className="font-medium underline-offset-4 hover:underline focus-visible:underline"
            >
                {row.original.organization.name}
            </Link>
        ),
    },
    {
        id: 'organization_state',
        header: 'Estado',
        cell: ({ row }) => (
            <OrganizationStateBadge
                suspendedAt={row.original.organization.suspended_at}
            />
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
        id: 'created_at',
        header: 'Desde',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: { className: 'hidden lg:table-cell whitespace-nowrap' },
    },
];

export function UserMembershipsCard({
    memberships,
}: {
    memberships: UserMembership[];
}) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>Organizaciones</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable
                    columns={columns}
                    data={memberships}
                    empty={
                        <EmptyState
                            icon={Building2}
                            title="Sin organizaciones"
                            description="Este usuario no pertenece a ninguna organización."
                        />
                    }
                />
            </CardContent>
        </Card>
    );
}
