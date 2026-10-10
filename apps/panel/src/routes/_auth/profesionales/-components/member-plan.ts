import type {
    Membership,
    MembershipRole,
    MembershipStatus,
} from '@/types/membership';

/** Roles an edit makes the membership hold as active that it didn't before — the API's own rule for the plan's member limits (#237). */
export function gainedActiveRoles(
    membership: Pick<Membership, 'roles' | 'status'>,
    roles: MembershipRole[],
    status: MembershipStatus,
): MembershipRole[] {
    if (status !== 'active') {
        return [];
    }

    const activeBefore = membership.status === 'active' ? membership.roles : [];

    return roles.filter((role) => !activeBefore.includes(role));
}
