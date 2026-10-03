import { api } from '@/lib/api';
import type { Prescription, PrescriptionPayload } from '@/types/prescription';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function queryKey(appointmentId: number | null) {
    return ['prescriptions', appointmentId];
}

// Interaction-triggered read (ADR 0007 exception): the dialog opens on demand
// from `AppointmentCard`, never from a route loader.
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

// Create when `prescriptionId` is null, update otherwise.
export function useSavePrescription(appointmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            prescriptionId,
            payload,
        }: {
            prescriptionId: number | null;
            payload: PrescriptionPayload;
        }) =>
            prescriptionId === null
                ? api.post(
                      `/appointments/${appointmentId}/prescriptions`,
                      payload,
                  )
                : api.patch(`/prescriptions/${prescriptionId}`, payload),
        // The whole `prescriptions` prefix: this appointment's list plus the
        // loader-only patient list and printable view. `refetchType: 'all'`
        // because those have no active observer and `ensureQueryData` would
        // otherwise keep serving the stale cache (ADR 0007).
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ['prescriptions'],
                refetchType: 'all',
            }),
    });
}
