import { api, refreshCsrfCookie } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions } from '@/lib/session';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

type InvitationInfo = {
    email: string;
    organization_name: string | null;
    requires_registration: boolean;
};

type AcceptInvitationPayload = {
    name?: string;
    password?: string;
    password_confirmation?: string;
};

export function useInvitationInfo(token: string) {
    return useQuery({
        queryKey: ['invitation', token],
        queryFn: () =>
            api
                .get<InvitationInfo>(`/invitations/${token}`)
                .then((response) => response.data),
        retry: false,
    });
}

export function useAcceptInvitation(token: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: AcceptInvitationPayload) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<{ message: string }>(`/invitations/${token}`, payload)
                    .then((response) => response.data),
            ),
        // Accepting logs in as the invited user, possibly replacing another
        // signed-in account: drop everything that account left cached and load
        // the new session before /agenda's guard and loaders read the cache.
        onSuccess: async () => {
            queryClient.clear();
            await queryClient
                .fetchQuery(sessionQueryOptions)
                .catch(() => undefined);
            await navigate({ to: '/agenda' });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
