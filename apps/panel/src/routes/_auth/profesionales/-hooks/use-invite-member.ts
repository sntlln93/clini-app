import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { MembershipRole } from '@/types/membership';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type InviteMemberPayload = {
    email: string;
    roles: MembershipRole[];
};

export function useInviteMember() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: InviteMemberPayload) =>
            api
                .post<{ message: string }>('/memberships/invitations', payload)
                .then((response) => response.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
