import { api } from '@/lib/api';
import type { PlatformAdmin } from '@/types/admin';
import { queryOptions, useQuery } from '@tanstack/react-query';

/** The signed-in operator (`GET /admin/me`); unlike the panel's flat `/me`, the payload is `data`-wrapped. */
export const adminSessionQueryOptions = queryOptions({
    queryKey: ['admin-session'],
    queryFn: () =>
        api
            .get<{ data: PlatformAdmin }>('/admin/me')
            .then((response) => response.data.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
    // Marks this query's 401 as an expected anonymous-visitor answer — read by `queryClient`'s `QueryCache.onError` to skip logging it.
    meta: { expectedUnauthorized: true },
});

export function useAdminSession() {
    return useQuery(adminSessionQueryOptions);
}
