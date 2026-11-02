import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export type PasswordChangePayload = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

/**
 * Changes the signed-in user's password (#389). This session stays open; the
 * API ends every other one.
 */
export function useChangePassword() {
    return useMutation({
        mutationFn: (payload: PasswordChangePayload) =>
            api.put('/me/password', payload),
    });
}
