import { CARDS_PAGE_SIZE, nextPageOf } from '@/features/list-view/list-view';
import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { Patient } from '@/types/patient';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

type PatientsQueryParams = {
    q: string;
    page: number;
};

function fetchPatients(params: { q: string; page: number; per_page?: number }) {
    return api
        .get<Paginated<Patient>>('/patients', {
            params: { ...params, q: params.q || undefined },
        })
        .then((response) => response.data);
}

export function patientsQueryOptions({ q, page }: PatientsQueryParams) {
    return queryOptions({
        queryKey: ['patients', { q, page }],
        queryFn: () => fetchPatients({ q, page }),
    });
}

// The cards view (#306): its loader brings the first page and the list asks
// for the next ones as the user scrolls.
export function patientCardsQueryOptions({ q }: { q: string }) {
    return infiniteQueryOptions({
        queryKey: ['patients', 'cards', { q }],
        queryFn: ({ pageParam }) =>
            fetchPatients({ q, page: pageParam, per_page: CARDS_PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: nextPageOf,
    });
}
