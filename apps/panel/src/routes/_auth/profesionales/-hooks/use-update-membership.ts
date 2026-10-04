import { api } from '@/lib/api';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import { notifySuccess } from '@/lib/toast';
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

// `memberships.last_active_admin` maps to `roles`, the field the user would change to fix it.
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
        // Navigates back to the list on success, whose loader refetches, so a plain invalidate is enough; errors render inline in the form.
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
            notifySuccess('Cambios guardados');
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
        // Its error already renders inline as the edit form's general message, so no error toast.
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
            notifySuccess('Miembro dado de baja');
        },
    });

    // No field map here on purpose: this flow has no field for `memberships.last_active_admin` to land on, so it surfaces as the general message instead of being silently dropped.
    const { message } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null };

    return { ...mutation, message };
}
