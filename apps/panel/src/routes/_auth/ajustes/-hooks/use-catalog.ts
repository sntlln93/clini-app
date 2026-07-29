import { api } from '@/lib/api';
import type { CatalogService, CatalogSpecialty } from '@/types/professional';
import { queryOptions } from '@tanstack/react-query';

export function catalogSpecialtiesQueryOptions() {
    return queryOptions({
        queryKey: ['catalog', 'specialties'],
        queryFn: () =>
            api
                .get<{ data: CatalogSpecialty[] }>('/specialties')
                .then((response) => response.data.data),
    });
}

export function catalogServicesQueryOptions() {
    return queryOptions({
        queryKey: ['catalog', 'services'],
        queryFn: () =>
            api
                .get<{ data: CatalogService[] }>('/services')
                .then((response) => response.data.data),
    });
}
