import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type RegisterPayload = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    organization_name: string;
};

export function useRegister() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: RegisterPayload) =>
            api
                .post<SessionUser>('/register', {
                    ...payload,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
                .then((response) => response.data),
        onSuccess: (user) => {
            queryClient.setQueryData(sessionQueryOptions.queryKey, user);
            navigate({ to: '/agenda' });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
