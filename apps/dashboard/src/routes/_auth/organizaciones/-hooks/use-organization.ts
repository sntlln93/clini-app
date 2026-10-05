import { api } from '@/lib/api';
import type { AdminOrganizationDetail } from '@/types/organization';
import { queryOptions } from '@tanstack/react-query';

export function organizationQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['organizations', 'detail', id],
        queryFn: () =>
            api
                .get<{ data: AdminOrganizationDetail }>(
                    `/admin/organizations/${id}`,
                )
                .then((response) => response.data.data),
    });
}
