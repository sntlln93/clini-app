import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Membership } from '@/types/membership';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRefreshPageData } from './use-refresh-page-data';

/**
 * Adds (#278) or removes (#286) the professional role on the caller's own
 * membership, through the same `PATCH /memberships/{id}` as editing a
 * member, so the plan's professional limit applies. Every roster is dropped
 * like any membership edit does (#273), and the session is re-read since the
 * role brings its own permissions; the page the user stays on reloads with
 * the new role.
 */
export function useOwnProfessionalRole(membership: Membership) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (attends: boolean) =>
            api.patch(`/memberships/${membership.id}`, {
                roles: attends
                    ? [...membership.roles, 'professional']
                    : membership.roles.filter(
                          (role) => role !== 'professional',
                      ),
                status: membership.status,
            }),
        onSuccess: (_response, attends) => {
            discardPageData(
                queryClient,
                ['memberships'],
                ['professionals'],
                ['reports'],
            );

            return refreshPageData(
                sessionQueryOptions.queryKey,
                planQueryOptions.queryKey,
            ).then(() =>
                notifySuccess(
                    attends
                        ? 'Ya figurás como profesional'
                        : 'Ya no figurás como profesional',
                ),
            );
        },
        onError: (error, attends) =>
            notifyError(
                error,
                attends
                    ? 'No se pudo sumarte como profesional.'
                    : 'No se pudo quitarte como profesional.',
            ),
    });
}
