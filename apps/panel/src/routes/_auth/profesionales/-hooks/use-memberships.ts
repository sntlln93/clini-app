import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { Paginated } from '@/types/pagination';
import { queryOptions } from '@tanstack/react-query';

type MembershipsQueryParams = {
    q: string;
    page: number;
    per_page?: number;
};

export function membershipsQueryOptions({
    q,
    page,
    per_page,
}: MembershipsQueryParams) {
    return queryOptions({
        queryKey: ['memberships', { q, page, per_page }],
        queryFn: () =>
            api
                .get<Paginated<Membership>>('/memberships', {
                    params: { q: q || undefined, page, per_page },
                })
                .then((response) => response.data),
    });
}
