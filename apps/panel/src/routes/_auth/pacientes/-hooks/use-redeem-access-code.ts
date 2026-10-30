import {
    patientClinicalNotesQueryKey,
    patientMedicalHistoryQueryKey,
    patientPrescriptionsQueryKey,
    patientQueryOptions,
    patientVitalSignsQueryKey,
} from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

// Redeems the code the patient shared (#364, ADR 0029) and reloads the page:
// the patient now says nothing is hidden, and the history comes back with the
// other professionals' records.
export function useRedeemAccessCode(patientId: number) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (code: string) =>
            api.post(`/patients/${patientId}/access-code-redemptions`, {
                code,
            }),
        onSuccess: () =>
            refreshPageData(
                patientQueryOptions(patientId).queryKey,
                patientClinicalNotesQueryKey(patientId),
                patientPrescriptionsQueryKey(patientId),
                patientVitalSignsQueryKey(patientId),
                patientMedicalHistoryQueryKey(patientId),
            ),
    });
}
