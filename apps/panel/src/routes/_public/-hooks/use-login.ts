import { api, refreshCsrfCookie } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { type SessionUser } from '@/lib/session';
import { useMutation } from '@tanstack/react-query';
import { useFinishLogin } from './use-finish-login';

type LoginPayload = {
    email: string;
    password: string;
};

/** The password matched, but the account asks for its second factor (#357): nothing is signed in yet. */
type TwoFactorPending = { two_factor: true };

type LoginResponse = SessionUser | TwoFactorPending;

function isTwoFactorPending(data: LoginResponse): data is TwoFactorPending {
    return 'two_factor' in data && data.two_factor === true;
}

export function useLogin(
    redirectTo?: string,
    onTwoFactorRequired?: () => void,
) {
    const finishLogin = useFinishLogin(redirectTo);

    const mutation = useMutation({
        mutationFn: (payload: LoginPayload) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<LoginResponse>('/login', payload)
                    .then((response) => response.data),
            ),
        onSuccess: (data) => {
            if (isTwoFactorPending(data)) {
                onTwoFactorRequired?.();
            } else {
                finishLogin(data);
            }
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
