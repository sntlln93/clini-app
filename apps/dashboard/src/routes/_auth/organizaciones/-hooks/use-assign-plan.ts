import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { AdminOrganizationDetail } from '@/types/organization';
import { useMutation } from '@tanstack/react-query';
import { ORGANIZATION_MODERATION_KEYS } from './use-suspend-organization';

/** Assigns Centro (`'center'`) or returns the organization to its subscription's plan (`null`), audited with the reason (#237). */
export function useAssignPlan(
    organizationId: number,
    assignedPlan: 'center' | null,
) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: (reason: string) =>
            api
                .put<{ data: AdminOrganizationDetail }>(
                    `/admin/organizations/${organizationId}/plan`,
                    { assigned_plan: assignedPlan, reason },
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess(
                assignedPlan === 'center'
                    ? 'Plan Centro asignado'
                    : 'Plan Centro quitado',
            );
            return refresh(...ORGANIZATION_MODERATION_KEYS);
        },
    });
}
