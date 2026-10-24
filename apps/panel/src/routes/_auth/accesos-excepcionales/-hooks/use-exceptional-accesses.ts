import { api } from '@/lib/api';
import { EXCEPTIONAL_ACCESSES_QUERY_KEY } from '@/lib/clinical-access';
import type { ExceptionalAccess } from '@/types/clinical-access';
import type { Paginated } from '@/types/pagination';
import { queryOptions } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the route loader only. An owner who also
// attends adds to it from a patient's page, which drops it
// (`useDeclareExceptionalAccess`).
export function exceptionalAccessesQueryOptions({ page }: { page: number }) {
    return queryOptions({
        queryKey: [...EXCEPTIONAL_ACCESSES_QUERY_KEY, { page }],
        queryFn: () =>
            api
                .get<Paginated<ExceptionalAccess>>('/exceptional-accesses', {
                    params: { page },
                })
                .then((response) => response.data),
    });
}
