import { api } from '@/lib/api';
import type { InsuranceProvider } from '@/types/patient';
import { useQuery } from '@tanstack/react-query';

export function useInsuranceProviders() {
    return useQuery({
        queryKey: ['insurance-providers'],
        queryFn: () =>
            api
                .get<{ data: InsuranceProvider[] }>('/insurance-providers')
                .then((response) => response.data.data),
        staleTime: 5 * 60 * 1000,
    });
}
