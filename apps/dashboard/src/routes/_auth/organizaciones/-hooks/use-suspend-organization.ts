import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { AdminOrganizationDetail } from '@/types/organization';
import { useMutation } from '@tanstack/react-query';

/**
 * Every read an organization's moderation state shows up in: `OrganizationRef.suspended_at` is also embedded in
 * a user's memberships (`['users', 'detail', id]`) and in a subscription's organization (`['subscriptions', …]`).
 */
export const ORGANIZATION_MODERATION_KEYS = [
    ['organizations'],
    ['users'],
    ['subscriptions'],
    ['audit-logs'],
    ['overview'],
] as const;

export function useSuspendOrganization(organizationId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: (reason: string) =>
            api
                .post<{ data: AdminOrganizationDetail }>(
                    `/admin/organizations/${organizationId}/suspension`,
                    { reason },
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess('Organización suspendida');
            return refresh(...ORGANIZATION_MODERATION_KEYS);
        },
    });
}
