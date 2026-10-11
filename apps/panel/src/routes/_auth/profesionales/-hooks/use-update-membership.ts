import { api } from '@/lib/api';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import { notifySuccess } from '@/lib/toast';
import type {
    Membership,
    MembershipRole,
    MembershipStatus,
} from '@/types/membership';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpdateMembershipPayload = {
    roles: MembershipRole[];
    status: MembershipStatus;
};

// `memberships.last_active_admin` maps to `roles`, the field the user would change to fix it.
const UPDATE_MEMBERSHIP_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'memberships.last_active_admin': 'roles',
};

// Every page read that lists members or professionals: this module's list and
// edit page, Ajustes' professionals, the roster of the agenda, availability,
// waiting room and reports, and the reports' per-professional rows. All are
// read only in loaders, so a plain invalidate never reaches them: they are
// dropped so the next visit loads them (#273). The user is sent to the list
// right after. The plan's professional count is re-read by the `_auth` loader.
function discardMembershipReads(queryClient: QueryClient) {
    discardPageData(
        queryClient,
        ['memberships'],
        ['professionals'],
        ['reports'],
    );
}

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
        // Errors render inline in the form.
        onSuccess: () => {
            discardMembershipReads(queryClient);
            queryClient.invalidateQueries({ queryKey: ['plan'] });
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
        // Its error already renders inline in the «Zona de peligro» section (MemberDangerZone), so no error toast.
        onSuccess: () => {
            discardMembershipReads(queryClient);
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            notifySuccess('Miembro dado de baja');
        },
    });

    // No field map here on purpose: this flow has no field for `memberships.last_active_admin` to land on, so it surfaces as a single message (shown by MemberDangerZone) instead of being silently dropped.
    const { message } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null };

    return { ...mutation, message };
}
