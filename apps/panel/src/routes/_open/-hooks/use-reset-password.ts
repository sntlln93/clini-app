import { api, refreshCsrfCookie } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export type PasswordResetPayload = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

/**
 * Sets the new password from the mailed link (#389). It never signs in, and
 * it ends every session of the account, a session open in this browser
 * included: the cache is dropped like on a logout, and the login that follows
 * asks for the second factor when it is on (ADR 0026).
 */
export function useResetPassword() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (payload: PasswordResetPayload) =>
            refreshCsrfCookie().then(() =>
                api.post('/password-resets', payload),
            ),
        onSuccess: () => {
            notifySuccess(
                'Cambiaste tu contraseña. Ingresá con la nueva para continuar.',
            );
            queryClient.clear();
            void navigate({ to: '/login' });
        },
    });
}
