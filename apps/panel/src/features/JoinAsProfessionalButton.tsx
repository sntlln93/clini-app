import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useOwnProfessionalRole } from '@/hooks/use-own-professional-role';
import { sessionHasPermission, type SessionUser } from '@/lib/session';
import type { Membership } from '@/types/membership';

/**
 * The caller's own membership when they can add themselves as a professional
 * (#278): they manage memberships and don't have the role yet.
 */
export function joinableMembership(
    session: SessionUser | undefined,
): Membership | null {
    const membership = session?.membership;

    if (
        !membership ||
        membership.roles.includes('professional') ||
        !sessionHasPermission(session, 'memberships.manage')
    ) {
        return null;
    }

    return membership;
}

export function JoinAsProfessionalButton({
    membership,
}: {
    membership: Membership;
}) {
    const join = useOwnProfessionalRole(membership);

    return (
        <Button onClick={() => join.mutate(true)} disabled={join.isPending}>
            {join.isPending && <Spinner data-icon="inline-start" aria-hidden />}
            Sumarme como profesional
        </Button>
    );
}
