import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { AdminUser } from '@/types/user';
import { queryOptions } from '@tanstack/react-query';

export type UsersQueryParams = {
    q: string;
    verified?: 'true' | 'false';
    blocked?: 'true' | 'false';
    page: number;
};

export function usersQueryOptions(params: UsersQueryParams) {
    return queryOptions({
        queryKey: ['users', 'list', params],
        queryFn: () =>
            api
                .get<Paginated<AdminUser>>('/admin/users', {
                    params: { ...params, q: params.q || undefined },
                })
                .then((response) => response.data),
    });
}
