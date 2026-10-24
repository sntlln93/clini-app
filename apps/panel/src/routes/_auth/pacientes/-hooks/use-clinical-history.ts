import {
    patientClinicalNotesQueryKey,
    patientPrescriptionsQueryKey,
    patientQueryOptions,
} from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import {
    CLINICAL_ACCESS_EXPIRED,
    EXCEPTIONAL_ACCESSES_QUERY_KEY,
    type ClinicalAccessReason,
} from '@/lib/clinical-access';
import { discardPageData } from '@/lib/page-data';
import type { ClinicalNote } from '@/types/clinical-note';
import type { PatientDetail } from '@/types/patient';
import type { Prescription } from '@/types/prescription';
import {
    useMutation,
    useQueryClient,
    type QueryClient,
} from '@tanstack/react-query';
import { patientClinicalNotesQueryOptions } from './use-patient-clinical-notes';
import { patientPrescriptionsQueryOptions } from './use-patient-prescriptions';

// What the patient page shows of the clinical history (#325): nothing when the
// acting membership may not read it, a request for the reason when it has no
// appointment with the patient near today, or the history itself.
export type ClinicalHistory =
    | { access: 'denied' }
    | { access: 'reason_required' }
    | {
          access: 'open';
          notes: ClinicalNote[];
          prescriptions: Prescription[];
      };

// Asks for the history only when the patient says it will be answered, so a
// patient page never leaves a failed request behind (#272). An exceptional
// access that expired while the patient stayed cached answers 409: the page
// asks for the reason again instead of failing.
export async function loadClinicalHistory(
    queryClient: QueryClient,
    patient: PatientDetail,
): Promise<ClinicalHistory> {
    if (!patient.can_view_clinical_notes) {
        return { access: 'denied' };
    }

    if (patient.clinical_access_reason_required) {
        return { access: 'reason_required' };
    }

    try {
        const [notes, prescriptions] = await Promise.all([
            queryClient.ensureQueryData(
                patientClinicalNotesQueryOptions(patient.id),
            ),
            queryClient.ensureQueryData(
                patientPrescriptionsQueryOptions(patient.id),
            ),
        ]);

        return { access: 'open', notes, prescriptions };
    } catch (error) {
        const appError = mapToAppError(error);

        if (
            appError.kind === 'business' &&
            appError.code === CLINICAL_ACCESS_EXPIRED
        ) {
            queryClient.removeQueries({
                queryKey: patientQueryOptions(patient.id).queryKey,
                exact: true,
            });

            return { access: 'reason_required' };
        }

        throw error;
    }
}

export type ExceptionalAccessPayload = {
    reason: ClinicalAccessReason;
    reason_detail: string | null;
};

// Opens the history for an hour (`ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES`)
// and reloads the page, whose patient now says it is open. The owner's list
// gains a row, so its cached pages go (#273). A 409 `reason_not_required`
// means an appointment near today was booked since the page loaded: the page
// reloads too, and opens without a reason.
export function useDeclareExceptionalAccess(patientId: number) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();
    const refreshHistory = () =>
        refreshPageData(
            patientQueryOptions(patientId).queryKey,
            patientClinicalNotesQueryKey(patientId),
            patientPrescriptionsQueryKey(patientId),
        );

    return useMutation({
        mutationFn: (payload: ExceptionalAccessPayload) =>
            api.post(`/patients/${patientId}/exceptional-accesses`, payload),
        onSuccess: () => {
            discardPageData(queryClient, EXCEPTIONAL_ACCESSES_QUERY_KEY);

            return refreshHistory();
        },
        onError: (error) => {
            const appError = mapToAppError(error);

            if (
                appError.kind === 'business' &&
                appError.code === 'clinical_access.reason_not_required'
            ) {
                return refreshHistory();
            }
        },
    });
}
