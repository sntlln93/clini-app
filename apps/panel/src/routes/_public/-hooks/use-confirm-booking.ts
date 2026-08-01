import { api } from '@/lib/api';
import type {
    BookingConfirmation,
    OnlineBookingPayload,
} from '@/types/booking';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

/**
 * Confirms the public booking. The user stays on `/reservar/$slug` after a
 * successful submit (the wizard swaps to its confirmation step instead of
 * navigating away), so this still follows the loader-read convention: the
 * day's slots came from a loader-backed read, and a slot just got taken, so
 * both `invalidateQueries` and `router.invalidate()` run on success (ADR
 * 0007's "leaves the user on the page" case).
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
