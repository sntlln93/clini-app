import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

/** Self-service only: backend resolves the caller's own membership from the session, so no membership id is sent — see MembershipSlugController. */
export function useUpdateMyPublicLink() {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (slug: string | null) =>
            api.patch('/memberships/me/slug', { slug }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['memberships', 'professionals'],
            });
            void router.invalidate();
            notifySuccess('Link público actualizado');
        },
        onError: (error) =>
            notifyError(error, 'No se pudo actualizar el link público'),
    });
}
