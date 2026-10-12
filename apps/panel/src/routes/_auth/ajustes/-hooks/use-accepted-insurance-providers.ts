import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { InsuranceProvider } from '@/types/patient';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

export const acceptedInsuranceProvidersQueryOptions = queryOptions({
    queryKey: ['organization', 'insurance-providers'],
    queryFn: () =>
        api
            .get<{
                data: InsuranceProvider[];
            }>('/organization/insurance-providers')
            .then((response) => response.data.data),
});

export function useSaveAcceptedInsuranceProviders() {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (insuranceProviderIds: number[]) =>
            api.put('/organization/insurance-providers', {
                insurance_provider_ids: insuranceProviderIds,
            }),
        onSuccess: () => {
            // The booking page offers them, and reads them only in its loader (#273).
            discardPageData(queryClient, ['booking']);

            return refreshPageData(
                acceptedInsuranceProvidersQueryOptions.queryKey,
            ).then(() => notifySuccess('Obras sociales guardadas'));
        },
        onError: (error) =>
            notifyError(error, 'No se pudieron guardar las obras sociales'),
    });
}
