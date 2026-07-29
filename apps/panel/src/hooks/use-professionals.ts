import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { queryOptions } from '@tanstack/react-query';

/**
 * Active, non-deleted memberships holding the `professional` role — the
 * only members that catalog assignments (services/specialties) apply to.
 * Consumed via a route loader (`ensureQueryData`); no page renders it with
 * a component-level `useQuery`.
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
