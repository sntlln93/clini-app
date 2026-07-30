import { api, refreshCsrfCookie } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type EmailVerificationInfo = {
    email: string;
};

export function useEmailVerificationInfo(token: string) {
    return useQuery({
        queryKey: ['email-verification', token],
        queryFn: () =>
            api
                .get<EmailVerificationInfo>(`/email-verification/${token}`)
                .then((response) => response.data),
        retry: false,
    });
}

export function useVerifyEmail(token: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: () =>
            refreshCsrfCookie().then(() =>
                api
                    .post<{ message: string }>(`/email-verification/${token}`)
                    .then((response) => response.data),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: sessionQueryOptions.queryKey,
            });
            navigate({ to: '/agenda' });
        },
    });
}
