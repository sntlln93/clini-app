import { api } from '@/lib/api';
import type { OverviewPeriod, PlatformOverview } from '@/types/overview';
import { queryOptions } from '@tanstack/react-query';

export function overviewQueryOptions({ days }: { days: OverviewPeriod }) {
    return queryOptions({
        queryKey: ['overview', { days }],
        queryFn: () =>
            api
                .get<{ data: PlatformOverview }>('/admin/overview', {
                    params: { days },
                })
                .then((response) => response.data.data),
    });
}
