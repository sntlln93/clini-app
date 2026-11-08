import { api } from '@/lib/api';
import type { SpecialtyCatalogUsage } from '@/types/specialty';
import { queryOptions } from '@tanstack/react-query';

export function specialtiesQueryOptions() {
    return queryOptions({
        queryKey: ['specialties'],
        queryFn: () =>
            api
                .get<{ data: SpecialtyCatalogUsage }>('/admin/specialties')
                .then((response) => response.data.data),
    });
}
