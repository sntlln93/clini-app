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
 * The organization isn't taking online bookings: its subscription expired,
 * or it has more professionals than its plan allows. The patient is never
 * told which, nor shown the copy written for the clinic (#237).
 */
export function isBookingClosedError(error: unknown): boolean {
    const appError = mapToAppError(error);

    return (
        appError.kind === 'business' &&
        (appError.code === 'subscriptions.inactive' ||
            appError.code === 'plans.professional_limit_exceeded')
    );
}

/**
 * The appointment's month is full for the organization's plan (#238). Other
 * months may still be open, so the patient is pointed there or to the
 * practice, never told why.
 */
export function isMonthFullError(error: unknown): boolean {
    const appError = mapToAppError(error);

    return (
        appError.kind === 'business' &&
        appError.code === 'plans.appointment_limit_reached'
    );
}

export const MONTH_FULL_MESSAGE =
    'No quedan turnos online para ese mes. Elegí una fecha de otro mes o comunicate directamente con el consultorio para pedir un turno.';

export const BOOKING_CLOSED_MESSAGE =
    'El consultorio no está tomando reservas online en este momento. Comunicate directamente con el consultorio para pedir un turno.';

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
                            insurance_provider_id:
                                payload.patient.insurance_provider_id,
                            insurance_member_number:
                                payload.patient.insurance_provider_id === null
                                    ? null
                                    : payload.patient.insurance_member_number,
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
