import { api, refreshCsrfCookie } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export type PasswordResetPayload = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

/** Asks for a reset link (#389). The API answers the same whether the address has an account or not. */
export function useRequestPasswordReset() {
    return useMutation({
        mutationFn: (email: string) =>
            refreshCsrfCookie().then(() =>
                api.post('/password-reset-links', { email }),
            ),
    });
}

/**
 * Sets the new password from the mailed link. It never signs in: the login
 * that follows asks for the second factor when it is on (ADR 0026).
 */
export function useResetPassword() {
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
            void navigate({ to: '/login' });
        },
    });
}
