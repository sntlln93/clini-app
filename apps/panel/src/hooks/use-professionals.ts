import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { queryOptions, useQuery } from '@tanstack/react-query';

/**
 * Active, non-deleted memberships holding the `professional` role — the
 * only members that catalog assignments (services/specialties) apply to.
 */
export function professionalsQueryOptions() {
    return queryOptions({
        queryKey: ['memberships', 'professionals'],
        queryFn: () =>
            api
                .get<{ data: Membership[] }>('/memberships')
                .then((response) =>
                    response.data.data.filter(
                        (membership) =>
                            membership.deleted_at === null &&
                            membership.status === 'active' &&
                            membership.roles.includes('professional'),
                    ),
                ),
    });
}

/** @deprecated Page reads use `professionalsQueryOptions` via a route loader. */
export function useProfessionals() {
    return useQuery(professionalsQueryOptions());
}
