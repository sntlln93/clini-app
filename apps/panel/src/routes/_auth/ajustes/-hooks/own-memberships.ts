import { sessionHasPermission, type SessionUser } from '@/lib/session';
import type { Membership } from '@/types/membership';

/** The caller's own membership, for each section of Ajustes that edits it. */
export function ownMemberships(session: SessionUser): {
    ownProfessionalMembership: Membership | null;
    managedOwnMembership: Membership | null;
} {
    const membership = session.membership ?? null;

    return {
        // Only a professional can hold a link of their own (CU-52); the API rejects anyone else's.
        ownProfessionalMembership: membership?.roles.includes('professional')
            ? membership
            : null,
        // Whoever can edit memberships can edit their own role (#286).
        managedOwnMembership: sessionHasPermission(
            session,
            'memberships.manage',
        )
            ? membership
            : null,
    };
}
