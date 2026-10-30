import { patientMedicalHistoryQueryKey } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import type {
    BloodType,
    MedicalHistory,
    MedicalHistoryAmendmentPayload,
    MedicalHistoryCategory,
} from '@/types/medical-history';
import { queryOptions, useMutation } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only,
// through `loadClinicalHistory`, once the history is open. Every author's
// blood types, allergies and antecedents of the practice (#361).
export function patientMedicalHistoryQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientMedicalHistoryQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: MedicalHistory }>(
                    `/patients/${patientId}/medical-history`,
                )
                .then((response) => response.data.data),
        // An exceptional access that expired while the patient stayed cached:
        // `loadClinicalHistory` asks for the reason again (#325).
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}

function useRefreshMedicalHistory(patientId: number) {
    const refreshPageData = useRefreshPageData();

    return () => refreshPageData(patientMedicalHistoryQueryKey(patientId));
}

// Changing the blood type records the new one; the earlier ones stay.
export function useRecordBloodType(patientId: number) {
    const refresh = useRefreshMedicalHistory(patientId);

    return useMutation({
        mutationFn: ({
            appointmentId,
            bloodType,
            reason,
        }: {
            appointmentId: number;
            bloodType: BloodType;
            reason: string | null;
        }) =>
            api.post(`/appointments/${appointmentId}/blood-types`, {
                blood_type: bloodType,
                reason,
            }),
        onSuccess: refresh,
    });
}

// Records one on `appointmentId` when `entryId` is null, amends it otherwise
// (a new version; the category stays).
export function useSaveMedicalHistoryEntry(patientId: number) {
    const refresh = useRefreshMedicalHistory(patientId);

    return useMutation({
        mutationFn: ({
            appointmentId,
            entryId,
            payload: { category, reason, ...content },
        }: {
            appointmentId: number;
            entryId: number | null;
            payload: MedicalHistoryAmendmentPayload & {
                category: MedicalHistoryCategory;
            };
        }): Promise<unknown> =>
            entryId === null
                ? api.post(
                      `/appointments/${appointmentId}/medical-history-entries`,
                      { category, ...content },
                  )
                : api.post(`/medical-history-entries/${entryId}/amendments`, {
                      ...content,
                      reason,
                  }),
        onSuccess: refresh,
    });
}

// It no longer applies: it stays, marked as withdrawn, with an optional reason.
export function useWithdrawMedicalHistoryEntry(patientId: number) {
    const refresh = useRefreshMedicalHistory(patientId);

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string | null }) =>
            api.post(`/medical-history-entries/${id}/withdrawal`, { reason }),
        onSuccess: refresh,
    });
}
