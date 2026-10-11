import { api } from '@/lib/api';
import type { OrganizationReport, ReportGranularity } from '@/types/report';
import { queryOptions } from '@tanstack/react-query';

/** All optional: an omitted filter falls back to the API's default, echoed in `period`. */
export type ReportQueryParams = {
    from?: string;
    to?: string;
    granularity?: ReportGranularity;
    membership_id?: number;
};

export function reportQueryOptions(params: ReportQueryParams) {
    return queryOptions({
        queryKey: ['reports', params],
        queryFn: () =>
            api
                .get<{ data: OrganizationReport }>('/reports', { params })
                .then((response) => response.data.data),
    });
}
