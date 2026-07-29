import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { queryOptions } from '@tanstack/react-query';

export function membershipsQueryOptions() {
    return queryOptions({
        queryKey: ['memberships'],
        queryFn: () =>
            api
                .get<{ data: Membership[] }>('/memberships')
                .then((response) => response.data.data),
    });
}
