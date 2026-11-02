import { api, refreshCsrfCookie } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

/** Asks for a reset link (#389). The API answers the same whether the address has an account or not. */
export function useRequestPasswordReset() {
    return useMutation({
        mutationFn: (email: string) =>
            refreshCsrfCookie().then(() =>
                api.post('/password-reset-links', { email }),
            ),
    });
}
