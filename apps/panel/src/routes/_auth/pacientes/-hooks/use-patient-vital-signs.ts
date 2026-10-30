import { patientVitalSignsQueryKey } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import type { VitalSign, VitalSignAmendmentPayload } from '@/types/vital-sign';
import { queryOptions, useMutation } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only,
// through `loadClinicalHistory`, once the history is open. Every author's
// measurements of the practice, newest first (#361).
export function patientVitalSignsQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientVitalSignsQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: VitalSign[] }>(
                    `/patients/${patientId}/vital-signs`,
                )
                .then((response) => response.data.data),
        // An exceptional access that expired while the patient stayed cached:
        // `loadClinicalHistory` asks for the reason again (#325).
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}

// Records one on `appointmentId` when `vitalSignId` is null, amends it
// otherwise: an amendment corrects the same point, it never adds one. The
// page reloads afterwards, its trail included.
export function useSaveVitalSign(patientId: number) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: ({
            appointmentId,
            vitalSignId,
            payload: { reason, ...values },
        }: {
            appointmentId: number;
            vitalSignId: number | null;
            payload: VitalSignAmendmentPayload;
        }): Promise<unknown> =>
            vitalSignId === null
                ? api.post(`/appointments/${appointmentId}/vital-signs`, values)
                : api.post(`/vital-signs/${vitalSignId}/amendments`, {
                      ...values,
                      reason,
                  }),
        onSuccess: () => refreshPageData(patientVitalSignsQueryKey(patientId)),
    });
}

// Takes it out of the series, keeping it with every version and the reason.
export function useAnnulVitalSign(patientId: number) {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            api.post(`/vital-signs/${id}/annulment`, { reason }),
        onSuccess: () => refreshPageData(patientVitalSignsQueryKey(patientId)),
    });
}
