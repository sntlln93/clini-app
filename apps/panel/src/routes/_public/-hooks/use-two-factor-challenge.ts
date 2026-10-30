import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import type { ErrorCode } from '@/lib/error-codes';
import { type SessionUser } from '@/lib/session';
import { useMutation } from '@tanstack/react-query';
import { useFinishLogin } from './use-finish-login';

/** Exactly one of the two: the authenticator app's code, or a recovery code. */
export type TwoFactorChallengePayload =
    { code: string } | { recovery_code: string };

/** The login's second step (#357): completes the login the password left pending. */
export function useTwoFactorChallenge(redirectTo?: string) {
    const finishLogin = useFinishLogin(redirectTo);

    return useMutation({
        mutationFn: (payload: TwoFactorChallengePayload) =>
            api
                .post<SessionUser>('/login/two-factor', payload)
                .then((response) => response.data),
        onSuccess: finishLogin,
    });
}

// The catalog's copy for these codes is written for Ajustes; on the login
// page the user only needs to know to start over.
const RESTART_MESSAGES: Partial<Record<ErrorCode, string>> = {
    'auth.two_factor_challenge_expired':
        'El inicio de sesión venció. Ingresá de nuevo tu correo y tu contraseña.',
    'auth.two_factor_not_enabled':
        'La verificación en dos pasos de tu cuenta se desactivó. Ingresá de nuevo con tu correo y tu contraseña.',
};

/**
 * The copy to send the user back to the password with, when the error means
 * the pending login is gone (expired, or the factor was turned off since);
 * `null` for an error the code form shows itself.
 */
export function restartMessageFor(error: unknown): string | null {
    const appError = mapToAppError(error);

    return appError.kind === 'business'
        ? (RESTART_MESSAGES[appError.code] ?? null)
        : null;
}
