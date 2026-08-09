import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { queryOptions } from '@tanstack/react-query';

/** Catalog assignments (services/specialties) apply only to professional-role members. */
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
