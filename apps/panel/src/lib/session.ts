import { api } from '@/lib/api';
import { queryOptions, useQuery } from '@tanstack/react-query';

export type SessionUser = {
    id: number;
    name: string;
    email: string;
    // Additive over the original flat /me payload: absent for a user with
    // no active membership in any organization.
    organization?: { id: number; name: string } | null;
    roles?: string[];
    permissions?: string[];
};

export const sessionQueryOptions = queryOptions({
    queryKey: ['session'],
    queryFn: () =>
        api.get<SessionUser>('/me').then((response) => response.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
    // Marks this query's 401 as an expected anonymous-visitor answer — read by `queryClient`'s `QueryCache.onError` to skip logging it.
    meta: { expectedUnauthorized: true },
});

export function useSession() {
    return useQuery(sessionQueryOptions);
}
