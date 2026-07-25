import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type LoginPayload = {
    email: string;
    password: string;
};

export function useLogin() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: LoginPayload) =>
            api
                .post<SessionUser>('/login', payload)
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
