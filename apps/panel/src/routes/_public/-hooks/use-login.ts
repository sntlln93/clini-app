import { api, refreshCsrfCookie } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { type SessionUser } from '@/lib/session';
import { useMutation } from '@tanstack/react-query';
import { useFinishLogin } from './use-finish-login';

type LoginPayload = {
    email: string;
    password: string;
};

export function useLogin(redirectTo?: string) {
    const finishLogin = useFinishLogin(redirectTo);

    const mutation = useMutation({
        mutationFn: (payload: LoginPayload) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<SessionUser>('/login', payload)
                    .then((response) => response.data),
            ),
        onSuccess: finishLogin,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
