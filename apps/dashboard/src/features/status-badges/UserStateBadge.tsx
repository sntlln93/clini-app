import { StatusPill } from '@/components/StatusPill';

type UserStateBadgeProps = {
    blockedAt: string | null;
    emailVerifiedAt: string | null;
};

/** Blocked wins over everything else: it is the state that locks the user out. */
export function UserStateBadge({
    blockedAt,
    emailVerifiedAt,
}: UserStateBadgeProps) {
    if (blockedAt !== null) {
        return <StatusPill tone="danger">Bloqueado</StatusPill>;
    }

    if (emailVerifiedAt === null) {
        return <StatusPill tone="warning">Sin verificar</StatusPill>;
    }

    return <StatusPill tone="success">Activo</StatusPill>;
}
