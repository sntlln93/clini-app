import { api } from '@/lib/api';
import { queryOptions, useQuery } from '@tanstack/react-query';

export type SessionUser = {
    id: number;
    name: string;
    email: string;
};

export const sessionQueryOptions = queryOptions({
    queryKey: ['session'],
    queryFn: () =>
        api.get<SessionUser>('/me').then((response) => response.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
});

export function useSession() {
    return useQuery(sessionQueryOptions);
}
