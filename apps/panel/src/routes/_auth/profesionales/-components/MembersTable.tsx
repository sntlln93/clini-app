import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Membership, MembershipRole } from '@/types/membership';

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
    onEdit: (membership: Membership) => void;
};

export function MembersTable({ memberships, onEdit }: MembersTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {memberships.map((membership) => (
                    <TableRow key={membership.id}>
                        <TableCell className="font-medium">
                            {membership.user.name ?? '—'}
                        </TableCell>
                        <TableCell>{membership.user.email ?? '—'}</TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {membership.roles.map((role) => (
                                    <Badge key={role} variant="outline">
                                        {ROLE_LABELS[role]}
                                    </Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant={
                                    membership.status === 'active'
                                        ? 'default'
                                        : 'secondary'
                                }
                            >
                                {STATUS_LABELS[membership.status]}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {membership.deleted_at === null && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(membership)}
                                >
                                    Editar
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
