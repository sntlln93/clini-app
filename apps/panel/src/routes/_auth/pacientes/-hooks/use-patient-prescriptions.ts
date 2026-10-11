import { api } from '@/lib/api';
import type { Prescription } from '@/types/prescription';
import { queryOptions } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
// Saving one from the agenda drops it (`useSavePrescription`), so the page
// loads it again on the way back.
// The API only ever returns the acting membership's own prescriptions.
export function patientPrescriptionsQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: ['prescriptions', 'patient', patientId],
        queryFn: () =>
            api
                .get<{ data: Prescription[] }>(
                    `/patients/${patientId}/prescriptions`,
                )
                .then((response) => response.data.data),
    });
}
