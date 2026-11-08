import { api } from '@/lib/api';
import type { SpecialtyCatalogUsage } from '@/types/specialty';
import { queryOptions } from '@tanstack/react-query';

export type SpecialtiesQueryParams = { q: string };

export function specialtiesQueryOptions(params: SpecialtiesQueryParams) {
    return queryOptions({
        queryKey: ['specialties', params],
        queryFn: () =>
            api
                .get<{ data: SpecialtyCatalogUsage }>('/admin/specialties', {
                    params: { q: params.q || undefined },
                })
                .then((response) => response.data.data),
    });
}
