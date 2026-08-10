import { api } from '@/lib/api';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import type { Membership } from '@/types/membership';
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
                .then((response) => response.data.data.filter(isProfessionalMembership)),
    });
}

/**
 * `GET /memberships` is admin-only (`memberships.view`); a Professional/Staff
 * caller would get a 403 there that must not take down the whole page, so this
 * degrades to the caller's own membership instead — but only when it satisfies
 * the same "is a professional" predicate as the full list, so a Staff caller's
 * non-professional membership never gets rendered as a bookable professional.
 */
export async function ensureScopedProfessionals(
    queryClient: QueryClient,
): Promise<Membership[]> {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);

    if (sessionHasPermission(session, 'memberships.view')) {
        return queryClient.ensureQueryData(professionalsQueryOptions());
    }

    return session.membership && isProfessionalMembership(session.membership)
        ? [session.membership]
        : [];
}
