import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';

/** Self-service only: backend resolves the caller's own membership from the session, so no membership id is sent — see MembershipSlugController. */
export function useUpdateMyPublicLink() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (slug: string | null) =>
            api.patch('/memberships/me/slug', { slug }),
        onSuccess: () =>
            // The section reads the saved slug from `session.membership`, so the
            // session has to refresh too, not just the members lists.
            refreshPageData(
                ['memberships', 'professionals'],
                sessionQueryOptions.queryKey,
            ).then(() => notifySuccess('Link público actualizado')),
        onError: (error) =>
            notifyError(error, 'No se pudo actualizar el link público'),
    });
}
