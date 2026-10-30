import { patientPrescriptionsQueryKey } from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import type { Prescription } from '@/types/prescription';
import { queryOptions } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
// Saving one from the agenda drops it (`useSavePrescription`), so the page
// loads it again on the way back.
// The API returns every author's prescriptions the reader may read, as the
// notes (#359): another author's only with the patient's code (#364). Only
// the loader's `loadClinicalHistory` asks, once the history is open.
export function patientPrescriptionsQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientPrescriptionsQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: Prescription[] }>(
                    `/patients/${patientId}/prescriptions`,
                )
                .then((response) => response.data.data),
        // An exceptional access that expired while the patient stayed cached:
        // `loadClinicalHistory` asks for the reason again (#325).
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}
