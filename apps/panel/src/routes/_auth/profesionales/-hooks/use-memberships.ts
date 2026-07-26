import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { useQuery } from '@tanstack/react-query';

export function useMemberships() {
    return useQuery({
        queryKey: ['memberships'],
        queryFn: () =>
            api
                .get<{ data: Membership[] }>('/memberships')
                .then((response) => response.data.data),
    });
}
