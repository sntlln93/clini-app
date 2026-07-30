import { api } from '@/lib/api';
import type { ErrorCode } from '@/lib/error-codes';
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

// `memberships.last_active_admin` lands on `roles` in this form (the field
// the user would change to fix it); the deactivation flow below has no
// dedicated field for it, so it deliberately has no map at all — an
// unmapped code becomes a general message instead, never silently dropped.
const UPDATE_MEMBERSHIP_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'memberships.last_active_admin': 'roles',
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
        ? extractFormErrors(mutation.error, UPDATE_MEMBERSHIP_FIELD_MAP)
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

    // No field map: this flow has no dedicated field for
    // `memberships.last_active_admin` to land on, so it always surfaces as
    // the general message.
    const { message } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null };

    return { ...mutation, message };
}
