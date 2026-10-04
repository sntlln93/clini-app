import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import type {
    BookingConfirmation,
    OnlineBookingPayload,
} from '@/types/booking';
import { useMutation } from '@tanstack/react-query';

/** The chosen time was taken between loading the grid and confirming (CU-36). */
export function isSlotUnavailableError(error: unknown): boolean {
    const appError = mapToAppError(error);

    return (
        appError.kind === 'business' &&
        appError.code === 'booking.slot_not_available'
    );
}

/**
 * The user stays on the page after submit, so the loader-fed slots list must
 * refresh (ADR 0007) — also when the slot turns out to be taken, since the
 * patient is sent back to that same grid.
 */
export function useConfirmBooking(slug: string) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (payload: OnlineBookingPayload) =>
            api
                .post<{ data: BookingConfirmation }>(
                    `/booking/${slug}/appointments`,
                    {
                        membership_id: payload.membershipId,
                        service_id: payload.serviceId,
                        start_at: payload.startAt,
                        patient: {
                            name: payload.patient.name,
                            document_type: payload.patient.document_type,
                            document_number: payload.patient.document_number,
                            email: payload.patient.email || null,
                            phone: payload.patient.phone || null,
                        },
                    },
                )
                .then((response) => response.data.data),
        onSuccess: () => refreshPageData(['booking', slug, 'slots']),
        onError: (error) =>
            isSlotUnavailableError(error)
                ? refreshPageData(['booking', slug, 'slots'])
                : undefined,
    });
}
