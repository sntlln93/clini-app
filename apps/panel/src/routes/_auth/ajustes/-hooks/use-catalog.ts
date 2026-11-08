import { api } from '@/lib/api';
import type { CatalogService } from '@/types/professional';
import { queryOptions } from '@tanstack/react-query';

export function catalogServicesQueryOptions() {
    return queryOptions({
        queryKey: ['catalog', 'services'],
        queryFn: () =>
            api
                .get<{ data: CatalogService[] }>('/services')
                .then((response) => response.data.data),
    });
}
