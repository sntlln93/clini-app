import { StatusPill } from '@/components/StatusPill';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { initialsOf } from '@/lib/initials';
import type { Membership } from '@/types/membership';
import { Link } from '@tanstack/react-router';
import { ROLE_LABELS, STATUS_LABELS, STATUS_TONES } from './member-labels';

// Only who attends has specialties: staff and admins show none (#306).
function specialtiesLabel({ roles, specialties = [] }: Membership) {
    if (!roles.includes('professional')) {
        return null;
    }

    return specialties.length > 0
        ? specialties.map((specialty) => specialty.name).join(', ')
        : 'Sin especialidades cargadas';
}

// The whole card opens the member, as the table's «Editar» does; a member
// already removed has nothing to open.
export function MemberCard({ membership }: { membership: Membership }) {
    const name = membership.user.name ?? membership.user.email ?? '—';
    const specialties = specialtiesLabel(membership);
    const linked = membership.deleted_at === null;

    return (
        <li className="min-w-0">
            <Card className="relative h-full transition-shadow has-[[data-card-link]:focus-visible]:ring-3 has-[[data-card-link]:focus-visible]:ring-ring/75 has-[[data-card-link]:hover]:shadow-md">
                <CardContent className="flex h-full flex-col gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="lg" aria-hidden="true">
                            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            {linked ? (
                                <Link
                                    to="/profesionales/$id/editar"
                                    params={{ id: membership.id }}
                                    data-card-link
                                    className="block truncate font-medium outline-none after:absolute after:inset-0"
                                >
                                    {name}
                                </Link>
                            ) : (
                                <p className="truncate font-medium">{name}</p>
                            )}
                            <p className="truncate text-muted-foreground">
                                {membership.roles
                                    .map((role) => ROLE_LABELS[role])
                                    .join(' · ')}
                            </p>
                        </div>
                    </div>
                    {specialties && (
                        <p className="text-muted-foreground">{specialties}</p>
                    )}
                    <div className="mt-auto">
                        <StatusPill tone={STATUS_TONES[membership.status]}>
                            {STATUS_LABELS[membership.status]}
                        </StatusPill>
                    </div>
                </CardContent>
            </Card>
        </li>
    );
}
