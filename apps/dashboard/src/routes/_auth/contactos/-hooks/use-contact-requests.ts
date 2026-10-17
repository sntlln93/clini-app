import { api } from '@/lib/api';
import type {
    AdminContactRequest,
    ContactRequestStatus,
} from '@/types/contact-request';
import type { Paginated } from '@/types/pagination';
import { queryOptions } from '@tanstack/react-query';

export type ContactRequestsQueryParams = {
    status?: ContactRequestStatus;
    page: number;
};

export function contactRequestsQueryOptions(
    params: ContactRequestsQueryParams,
) {
    return queryOptions({
        queryKey: ['contact-requests', 'list', params],
        queryFn: () =>
            api
                .get<Paginated<AdminContactRequest>>(
                    '/admin/contact-requests',
                    { params: { status: params.status, page: params.page } },
                )
                .then((response) => response.data),
    });
}
