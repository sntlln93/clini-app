import { api, refreshCsrfCookie } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { safeInternalPath } from '@/lib/safe-internal-path';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type LoginPayload = {
    email: string;
    password: string;
};

export function useLogin(redirectTo?: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: LoginPayload) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<SessionUser>('/login', payload)
                    .then((response) => response.data),
            ),
        onSuccess: (user) => {
            // Drops whatever a previous session left cached, so the redirect
            // target's loaders can't serve another account's data.
            queryClient.clear();
            queryClient.setQueryData(sessionQueryOptions.queryKey, user);
            // Re-checked here too, so no caller can turn this into an open redirect.
            const target = safeInternalPath(redirectTo);
            if (target) {
                navigate({ href: target });
            } else {
                navigate({ to: '/agenda' });
            }
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
