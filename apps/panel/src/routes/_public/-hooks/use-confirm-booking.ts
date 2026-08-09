import { api } from '@/lib/api';
import type {
    BookingConfirmation,
    OnlineBookingPayload,
} from '@/types/booking';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

/**
 * The user stays on the page after submit, so `router.invalidate()` runs
 * alongside `invalidateQueries` (ADR 0007).
 */
export function useConfirmBooking(slug: string) {
    const queryClient = useQueryClient();
    const router = useRouter();

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
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['booking', slug, 'slots'],
            });
            void router.invalidate();
        },
    });
}
