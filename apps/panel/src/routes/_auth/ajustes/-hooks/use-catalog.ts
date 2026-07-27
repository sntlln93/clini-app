import { api } from '@/lib/api';
import type { CatalogService, CatalogSpecialty } from '@/types/professional';
import { useQuery } from '@tanstack/react-query';

export function useCatalogSpecialties() {
    return useQuery({
        queryKey: ['catalog', 'specialties'],
        queryFn: () =>
            api
                .get<{ data: CatalogSpecialty[] }>('/specialties')
                .then((response) => response.data.data),
    });
}

export function useCatalogServices() {
    return useQuery({
        queryKey: ['catalog', 'services'],
        queryFn: () =>
            api
                .get<{ data: CatalogService[] }>('/services')
                .then((response) => response.data.data),
    });
}
