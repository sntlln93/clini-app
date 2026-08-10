import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import type {
    BookingConfirmation,
    OnlineBookingPayload,
} from '@/types/booking';
import { useMutation } from '@tanstack/react-query';

/** The user stays on the page after submit, so the loader-fed slots list must refresh (ADR 0007). */
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
    });
}
