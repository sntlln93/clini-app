import { CARDS_PAGE_SIZE, nextPageOf } from '@/features/list-view/list-view';
import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { Paginated } from '@/types/pagination';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

type MembershipsQueryParams = {
    q: string;
    page: number;
    per_page?: number;
};

function fetchMemberships({ q, page, per_page }: MembershipsQueryParams) {
    return api
        .get<Paginated<Membership>>('/memberships', {
            params: { q: q || undefined, page, per_page },
        })
        .then((response) => response.data);
}

export function membershipsQueryOptions({
    q,
    page,
    per_page,
}: MembershipsQueryParams) {
    return queryOptions({
        queryKey: ['memberships', { q, page, per_page }],
        queryFn: () => fetchMemberships({ q, page, per_page }),
    });
}

// The cards view (#306): its loader brings the first page and the list asks
// for the next ones as the user scrolls. Its key is apart from the table's so
// a specialty change can drop it alone: only the cards show specialties.
export function membershipCardsQueryOptions({ q }: { q: string }) {
    return infiniteQueryOptions({
        queryKey: ['memberships', 'cards', { q }],
        queryFn: ({ pageParam }) =>
            fetchMemberships({ q, page: pageParam, per_page: CARDS_PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: nextPageOf,
    });
}

export function membershipQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['memberships', id],
        queryFn: () =>
            api
                .get<{ data: Membership }>(`/memberships/${id}`)
                .then((response) => response.data.data),
    });
}
