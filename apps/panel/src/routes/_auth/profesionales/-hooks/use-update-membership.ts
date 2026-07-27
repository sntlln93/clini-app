import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type {
    Membership,
    MembershipRole,
    MembershipStatus,
} from '@/types/membership';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpdateMembershipPayload = {
    roles: MembershipRole[];
    status: MembershipStatus;
};

export function useUpdateMembership(membershipId: number) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateMembershipPayload) =>
            api
                .patch<{ data: Membership }>(
                    `/memberships/${membershipId}`,
                    payload,
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeactivateMembership() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (membershipId: number) =>
            api.delete(`/memberships/${membershipId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    // The deactivation guards attach to a generic `membership` field (there's
    // no dedicated form field for it), so that's the message to surface.
    return { ...mutation, message: errors.membership ?? message };
}
