import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Where the practice attends (#380); the session carries it, so it refreshes. */
export function useUpdateOrganizationProvince() {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (province: string) =>
            api.put('/organization/province', { province }),
        onSuccess: () => {
            // Its provincial holidays close or open the booking page's slots,
            // which only that page's loader reads (#273).
            discardPageData(queryClient, ['booking']);

            return refreshPageData(sessionQueryOptions.queryKey).then(() =>
                notifySuccess('Provincia guardada'),
            );
        },
        onError: (error) =>
            notifyError(error, 'No se pudo guardar la provincia'),
    });
}
