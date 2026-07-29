import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { Patient } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

type PatientsQueryParams = {
    q: string;
    page: number;
};

export function patientsQueryOptions({ q, page }: PatientsQueryParams) {
    return queryOptions({
        queryKey: ['patients', { q, page }],
        queryFn: () =>
            api
                .get<Paginated<Patient>>('/patients', {
                    params: { q: q || undefined, page },
                })
                .then((response) => response.data),
    });
}
