import { DataTable } from '@/components/DataTable';
import { DataTableRowActions } from '@/components/DataTableRowActions';
import { Badge } from '@/components/ui/badge';
import type { Membership, MembershipRole } from '@/types/membership';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

const ROLE_LABELS: Record<MembershipRole, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    professional: 'Profesional',
    staff: 'Personal',
};

const STATUS_LABELS: Record<Membership['status'], string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
};

type MembersTableProps = {
    memberships: Membership[];
    empty: ReactNode;
};

function MemberRowActions({ membership }: { membership: Membership }) {
    const navigate = useNavigate();

    return (
        <DataTableRowActions
            actions={[
                {
                    label: 'Editar',
                    icon: Pencil,
                    onSelect: () =>
                        navigate({
                            to: '/profesionales/$id/editar',
                            params: { id: String(membership.id) },
                        }),
                },
            ]}
        />
    );
}

const columns: ColumnDef<Membership, unknown>[] = [
    {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => (
            <span className="font-medium">{row.original.user.name ?? '—'}</span>
        ),
    },
    {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.user.email ?? '—',
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
                {row.original.roles.map((role) => (
                    <Badge key={role} variant="outline">
                        {ROLE_LABELS[role]}
                    </Badge>
                ))}
            </div>
        ),
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => (
            <Badge
                variant={
                    row.original.status === 'active' ? 'default' : 'secondary'
                }
            >
                {STATUS_LABELS[row.original.status]}
            </Badge>
        ),
    },
    {
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) =>
            row.original.deleted_at === null ? (
                <MemberRowActions membership={row.original} />
            ) : null,
        meta: { className: 'text-right' },
    },
];

export function MembersTable({ memberships, empty }: MembersTableProps) {
    return <DataTable columns={columns} data={memberships} empty={empty} />;
}
