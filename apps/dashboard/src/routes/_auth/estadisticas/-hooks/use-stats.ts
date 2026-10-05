import { api } from '@/lib/api';
import type { PlatformStats } from '@/types/stats';
import { queryOptions } from '@tanstack/react-query';

/** All optional: an omitted bound falls back to the API's default (last 30 days ending today), echoed in `period`. */
export type StatsQueryParams = {
    from?: string;
    to?: string;
    organization_id?: number;
};

export function statsQueryOptions(params: StatsQueryParams) {
    return queryOptions({
        queryKey: ['stats', params],
        queryFn: () =>
            api
                .get<{ data: PlatformStats }>('/admin/stats', { params })
                .then((response) => response.data.data),
    });
}
