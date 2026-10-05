import { api } from '@/lib/api';
import type { AdminRef } from '@/types/admin';
import { queryOptions } from '@tanstack/react-query';

/** Every operator, ordered by name (not paginated) — feeds the "Operador" filter. */
export const platformAdminsQueryOptions = queryOptions({
    queryKey: ['platform-admins'],
    queryFn: () =>
        api
            .get<{ data: AdminRef[] }>('/admin/platform-admins')
            .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
});
