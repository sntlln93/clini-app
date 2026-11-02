import { safeInternalPath } from '@/lib/safe-internal-path';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { notifySuccess } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

/** Stores the session the login answered and leaves the login page. */
export function useFinishLogin(redirectTo?: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useCallback(
        ({ account_deletion_cancelled, ...user }: SessionUser) => {
            // Drops whatever a previous session left cached, so the redirect
            // target's loaders can't serve another account's data.
            queryClient.clear();
            queryClient.setQueryData(sessionQueryOptions.queryKey, user);
            if (account_deletion_cancelled) {
                notifySuccess(
                    'Cancelamos la eliminación de tu cuenta: todo quedó como antes.',
                );
            }
            // Re-checked here too, so no caller can turn this into an open redirect.
            const target = safeInternalPath(redirectTo);
            if (target) {
                navigate({ href: target });
            } else {
                navigate({ to: '/agenda' });
            }
        },
        [queryClient, navigate, redirectTo],
    );
}
