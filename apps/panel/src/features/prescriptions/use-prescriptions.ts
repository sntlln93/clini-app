import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import type {
    Prescription,
    PrescriptionAmendmentPayload,
} from '@/types/prescription';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function queryKey(appointmentId: number | null) {
    return ['prescriptions', appointmentId];
}

// Interaction-triggered read (ADR 0007 exception): the dialog opens on demand
// from `AppointmentCard` or the patient page, never from a route loader.
export function usePrescriptions(appointmentId: number | null, open: boolean) {
    return useQuery({
        queryKey: queryKey(appointmentId),
        queryFn: () =>
            api
                .get<{ data: Prescription[] }>(
                    `/appointments/${appointmentId}/prescriptions`,
                )
                .then((response) => response.data.data),
        enabled: open && appointmentId !== null,
    });
}

// Records one when `prescriptionId` is null, amends it otherwise: a record is
// never edited (#323), an amendment adds a version and keeps the earlier ones.
export function useSavePrescription(appointmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            prescriptionId,
            payload: { items, reason },
        }: {
            prescriptionId: number | null;
            payload: PrescriptionAmendmentPayload;
        }) =>
            prescriptionId === null
                ? api.post(`/appointments/${appointmentId}/prescriptions`, {
                      items,
                  })
                : api.post(`/prescriptions/${prescriptionId}/amendments`, {
                      items,
                      reason,
                  }),
        // The loader-only patient list is dropped, not refetched:
        // `ensureQueryData` would serve it while a refetch is in flight (#273).
        // The dialog's first load is cancelled before its own refresh, which
        // would otherwise join it and keep its pre-save answer.
        onSuccess: async () => {
            discardPageData(queryClient, ['prescriptions', 'patient']);
            await queryClient.cancelQueries({
                queryKey: queryKey(appointmentId),
            });
            await queryClient.invalidateQueries({
                queryKey: queryKey(appointmentId),
            });
        },
    });
}
