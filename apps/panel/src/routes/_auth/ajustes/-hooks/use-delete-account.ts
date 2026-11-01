import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import { formatDayMonthYear, fromInstant } from '@/lib/datetime';
import { notifySuccess } from '@/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

/** The password, and with the second factor on, one of its two codes. */
export type AccountDeletionPayload = {
    password: string;
    code?: string;
    recovery_code?: string;
};

/**
 * Asks to delete the account (#384). The API closes every session, this one
 * included, so it leaves for the login like a logout does: logging in again
 * within the grace period is what cancels it.
 */
export function useDeleteAccount() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (payload: AccountDeletionPayload) =>
            api
                .post<{
                    data: { deletes_at: string };
                }>('/me/account-deletion', payload)
                .then((response) => response.data.data),
        onSuccess: ({ deletes_at }) => {
            notifySuccess(
                `Vamos a eliminar tu cuenta el ${formatDayMonthYear(fromInstant(deletes_at))}. Si cambiás de idea, ingresá antes de esa fecha.`,
            );
            queryClient.clear();
            navigate({ to: '/login' });
        },
    });
}

/** The organizations a refusal names: where the user is the last admin, or still has appointments. */
export function blockingOrganizations(error: unknown): string[] {
    const appError = mapToAppError(error);

    if (
        appError.kind !== 'business' ||
        (appError.code !== 'account.deletion_last_active_admin' &&
            appError.code !== 'account.deletion_future_appointments')
    ) {
        return [];
    }

    const organizations = appError.context.organizations;

    return Array.isArray(organizations)
        ? organizations
              .map((organization: unknown) =>
                  typeof organization === 'object' &&
                  organization !== null &&
                  'name' in organization &&
                  typeof organization.name === 'string'
                      ? organization.name
                      : null,
              )
              .filter((name): name is string => name !== null)
        : [];
}
