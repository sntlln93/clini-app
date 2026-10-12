import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Membership } from '@/types/membership';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRefreshPageData } from './use-refresh-page-data';

/**
 * Adds the professional role to the caller's own membership (#278), through
 * the same `PATCH /memberships/{id}` as editing a member, so the plan's
 * professional limit applies. Every roster is dropped like any membership
 * edit does (#273), and the session is re-read since the role brings its own
 * permissions; the page the user stays on reloads with them as a professional.
 */
export function useJoinAsProfessional(membership: Membership) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: () =>
            api.patch(`/memberships/${membership.id}`, {
                roles: [...membership.roles, 'professional'],
                status: membership.status,
            }),
        onSuccess: () => {
            discardPageData(
                queryClient,
                ['memberships'],
                ['professionals'],
                ['reports'],
            );

            return refreshPageData(
                sessionQueryOptions.queryKey,
                planQueryOptions.queryKey,
            ).then(() => notifySuccess('Ya figurás como profesional'));
        },
        onError: (error) =>
            notifyError(error, 'No se pudo sumarte como profesional.'),
    });
}
