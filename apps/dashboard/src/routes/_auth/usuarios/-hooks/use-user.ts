import { api } from '@/lib/api';
import type { AdminUserDetail } from '@/types/user';
import { queryOptions } from '@tanstack/react-query';

export function userQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['users', 'detail', id],
        queryFn: () =>
            api
                .get<{ data: AdminUserDetail }>(`/admin/users/${id}`)
                .then((response) => response.data.data),
    });
}
