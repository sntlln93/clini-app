import { api } from '@/lib/api';
import type { MedicalHistoryEntry } from '@/types/medical-history';
import { useQuery } from '@tanstack/react-query';

// `reasonRequired`: without an appointment near today the API reads nothing,
// since the history then opens from the patient page with a reason.
export type CurrentAllergies = {
    allergies: MedicalHistoryEntry[];
    reasonRequired: boolean;
};

// Interaction-triggered read (ADR 0007 exception): the patient's current
// allergies the professional reads, above the form that indicates medication
// (#362). A read of the history like the patient page's.
export function useCurrentAllergies(appointmentId: number | null) {
    return useQuery({
        queryKey: ['appointments', appointmentId, 'allergies'],
        queryFn: (): Promise<CurrentAllergies> =>
            api
                .get<{
                    data: MedicalHistoryEntry[];
                    meta: { reason_required: boolean };
                }>(`/appointments/${appointmentId}/allergies`)
                .then((response) => ({
                    allergies: response.data.data,
                    reasonRequired: response.data.meta.reason_required,
                })),
        enabled: appointmentId !== null,
        // No allergy mutation drops this key, and every open is a logged read
        // anyway: an earlier open's list is never shown first.
        gcTime: 0,
    });
}
