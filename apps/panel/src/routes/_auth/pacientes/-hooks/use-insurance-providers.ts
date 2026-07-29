import { api } from '@/lib/api';
import type { InsuranceProvider } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

export function insuranceProvidersQueryOptions() {
    return queryOptions({
        queryKey: ['insurance-providers'],
        queryFn: () =>
            api
                .get<{ data: InsuranceProvider[] }>('/insurance-providers')
                .then((response) => response.data.data),
        staleTime: 5 * 60 * 1000,
    });
}
