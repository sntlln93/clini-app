import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { AdminOrganizationDetail } from '@/types/organization';
import { useMutation } from '@tanstack/react-query';
import { ORGANIZATION_MODERATION_KEYS } from './use-suspend-organization';

export function useReactivateOrganization(organizationId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: () =>
            api
                .delete<{ data: AdminOrganizationDetail }>(
                    `/admin/organizations/${organizationId}/suspension`,
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess('Organización reactivada');
            return refresh(...ORGANIZATION_MODERATION_KEYS);
        },
        onError: (error) =>
            notifyError(error, 'No pudimos reactivar la organización.'),
    });
}
