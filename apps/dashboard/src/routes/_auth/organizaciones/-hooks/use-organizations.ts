import { api } from '@/lib/api';
import type {
    AdminOrganization,
    OrganizationStateFilter,
    OrganizationSubscriptionFilter,
} from '@/types/organization';
import type { Paginated } from '@/types/pagination';
import { queryOptions } from '@tanstack/react-query';

export type OrganizationSort = 'created_at' | 'name';
export type SortDirection = 'asc' | 'desc';

export type OrganizationsQueryParams = {
    q: string;
    status?: OrganizationStateFilter;
    subscription_status?: OrganizationSubscriptionFilter;
    sort?: OrganizationSort;
    direction?: SortDirection;
    page: number;
};

export function organizationsQueryOptions(params: OrganizationsQueryParams) {
    return queryOptions({
        queryKey: ['organizations', 'list', params],
        queryFn: () =>
            api
                .get<Paginated<AdminOrganization>>('/admin/organizations', {
                    params: { ...params, q: params.q || undefined },
                })
                .then((response) => response.data),
    });
}
