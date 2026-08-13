import { api } from '@/lib/api';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import type { Membership } from '@/types/membership';
import type { Professional } from '@/types/professional';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

/** Shared predicate for what counts as a bookable professional membership. */
export function isProfessionalMembership(membership: Membership): boolean {
    return (
        membership.deleted_at === null &&
        membership.status === 'active' &&
        membership.roles.includes('professional')
    );
}

/** Catalog assignments (services/specialties) apply only to professional-role members. */
export function professionalsQueryOptions() {
    return queryOptions({
        queryKey: ['memberships', 'professionals'],
        queryFn: () =>
            api
                .get<{ data: Membership[] }>('/memberships')
                .then((response) =>
                    response.data.data.filter(isProfessionalMembership),
                ),
    });
}

/** The organization's active professional roster, via the dedicated endpoint — no client-side filtering, the server already scopes it. */
export function professionalRosterQueryOptions() {
    return queryOptions({
        queryKey: ['professionals', 'roster'],
        queryFn: () =>
            api
                .get<{ data: Professional[] }>('/professionals')
                .then((response) => response.data.data),
    });
}

const ROSTER_PERMISSIONS = [
    'appointments.view',
    'appointments.create',
    'appointments.update',
    'availability.manage',
] as const;

function membershipToProfessional(membership: Membership): Professional {
    return {
        id: membership.id,
        user: {
            id: membership.user.id,
            name: membership.user.name ?? '',
            email: membership.user.email ?? '',
        },
    };
}

/**
 * A session holding any of the agenda/availability permissions reads the
 * dedicated `GET /professionals` roster endpoint, authorized independently
 * of `memberships.view` (see `MembershipPolicy::viewProfessionalRoster`).
 * A session with none of them (e.g. a plain Professional) degrades to its
 * own membership instead — but only when it satisfies the same "is a
 * professional" predicate as the full list, so a Staff caller's
 * non-professional membership never gets rendered as a bookable professional.
 */
export async function ensureScopedProfessionals(
    queryClient: QueryClient,
): Promise<Professional[]> {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);

    if (
        ROSTER_PERMISSIONS.some((permission) =>
            sessionHasPermission(session, permission),
        )
    ) {
        return queryClient.ensureQueryData(professionalRosterQueryOptions());
    }

    return session.membership && isProfessionalMembership(session.membership)
        ? [membershipToProfessional(session.membership)]
        : [];
}
