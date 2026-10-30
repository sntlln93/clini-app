import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import type { MedicalHistoryEntry } from '@/types/medical-history';
import { useQuery } from '@tanstack/react-query';

// Interaction-triggered read (ADR 0007 exception): the patient's current
// allergies the professional reads, above the form that indicates medication
// (#362). A read of the history like the patient page's, so without an
// appointment near today it takes an exceptional access first.
export function useCurrentAllergies(appointmentId: number | null) {
    return useQuery({
        queryKey: ['appointments', appointmentId, 'allergies'],
        queryFn: () =>
            api
                .get<{ data: MedicalHistoryEntry[] }>(
                    `/appointments/${appointmentId}/allergies`,
                )
                .then((response) => response.data.data),
        enabled: appointmentId !== null,
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}
