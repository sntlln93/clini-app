import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { CONTACT_REQUEST_STATUS_LABELS } from '@/lib/labels';
import { notifyError, notifySuccess } from '@/lib/toast';
import type {
    AdminContactRequest,
    ContactRequestStatus,
} from '@/types/contact-request';
import { useMutation } from '@tanstack/react-query';

/**
 * `onChanged` runs before the refresh: on a status-filtered list the refresh
 * drops the request's row, unmounting its dialog, and a per-call `onSuccess`
 * would no longer run.
 */
export function useChangeContactRequestStatus(
    contactRequestId: number,
    onChanged: (status: ContactRequestStatus) => void,
) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: (status: ContactRequestStatus) =>
            api
                .put<{ data: AdminContactRequest }>(
                    `/admin/contact-requests/${contactRequestId}/status`,
                    { status },
                )
                .then((response) => response.data.data),
        onSuccess: (contactRequest) => {
            onChanged(contactRequest.status);
            notifySuccess(
                `Consulta marcada como «${CONTACT_REQUEST_STATUS_LABELS[contactRequest.status].toLowerCase()}»`,
            );
            return refresh(['contact-requests'], ['audit-logs']);
        },
        onError: (error) =>
            notifyError(error, 'No pudimos cambiar el estado de la consulta.'),
    });
}
