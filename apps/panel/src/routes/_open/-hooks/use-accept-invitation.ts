import { api, refreshCsrfCookie } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions } from '@/lib/session';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export type InvitationInfo = {
    email: string;
    organization_name: string | null;
    requires_registration: boolean;
    /** A professional one starts with the DNI (#417). */
    professional: boolean;
    document_lookups_left: number;
};

/** Who the DNI found (#417): the registry's name, and the account it links to. */
export type InvitationIdentity = {
    name: string;
    account: { email: string; two_factor: boolean } | null;
    document_lookups_left: number;
};

export type AcceptInvitationPayload = {
    name?: string;
    password?: string;
    password_confirmation?: string;
    code?: string;
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

/** Looks the DNI up in the registry; the API keeps what it found for the acceptance. */
export function useInvitationDocumentLookup(token: string) {
    return useMutation({
        mutationFn: (documentNumber: string) =>
            refreshCsrfCookie().then(() =>
                api
                    .post<{ data: InvitationIdentity }>(
                        `/invitations/${token}/document-lookups`,
                        { document_number: documentNumber },
                    )
                    .then((response) => response.data.data),
            ),
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
