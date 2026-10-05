import { api, refreshCsrfCookie } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import { extractFormErrors } from '@/lib/form-errors';
import { safeInternalPath } from '@/lib/safe-internal-path';
import { adminSessionQueryOptions } from '@/lib/session';
import type { PlatformAdmin } from '@/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type LoginPayload = {
    email: string;
    password: string;
};

export const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos.';

/**
 * Form errors for a failed login. The backend's wrong-credentials answer is
 * a message-only 422 ("Invalid credentials.", English): it is never rendered,
 * the form shows its own Spanish copy instead. Everything else (per-field
 * 422, 419, 429, network) goes through the shared mapping.
 */
export function loginFormErrors(error: unknown) {
    const appError = mapToAppError(error);

    if (
        appError.kind === 'validation' &&
        Object.keys(appError.fields).length === 0
    ) {
        return { message: INVALID_CREDENTIALS_MESSAGE, errors: {} };
    }

    return extractFormErrors(error);
}

export function useLogin(redirectTo?: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (payload: LoginPayload) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<{ data: PlatformAdmin }>('/admin/login', payload)
                    .then((response) => response.data.data),
            ),
        onSuccess: (admin) => {
            // Drops whatever a previous session left cached, so the redirect
            // target's loaders can't serve another operator's data.
            queryClient.clear();
            queryClient.setQueryData(adminSessionQueryOptions.queryKey, admin);
            // Re-checked here too, so no caller can turn this into an open redirect.
            const target = safeInternalPath(redirectTo);
            if (target) {
                navigate({ href: target });
            } else {
                navigate({ to: '/' });
            }
        },
    });
}
