import { api } from '@/lib/api';
import type { Prescription } from '@/types/prescription';
import { queryOptions } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
// Under the `prescriptions` prefix so saving one from the agenda refetches it
// (`useSavePrescription` invalidates with `refetchType: 'all'`).
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
