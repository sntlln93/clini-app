import {
    patientClinicalNotesQueryKey,
    patientMedicalHistoryQueryKey,
    patientPrescriptionsQueryKey,
    patientQueryOptions,
    patientVitalSignsQueryKey,
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
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type { ClinicalNote } from '@/types/clinical-note';
import type { MedicalHistory } from '@/types/medical-history';
import type { Paginated } from '@/types/pagination';
import type { PatientDetail } from '@/types/patient';
import type { Prescription } from '@/types/prescription';
import type { VitalSign } from '@/types/vital-sign';
import {
    useMutation,
    useQueryClient,
    type FetchQueryOptions,
    type QueryClient,
    type QueryKey,
} from '@tanstack/react-query';
import { loadClinicalAccessTrail } from './use-clinical-access-trail';
import { patientClinicalNotesQueryOptions } from './use-patient-clinical-notes';
import { patientMedicalHistoryQueryOptions } from './use-patient-medical-history';
import { patientPrescriptionsQueryOptions } from './use-patient-prescriptions';
import { patientVitalSignsQueryOptions } from './use-patient-vital-signs';

// What the patient page shows of the clinical history (#325): nothing when the
// acting membership may not read it, a request for the reason when it has no
// appointment with the patient near today, or the history itself, with the
// page of its access trail that the URL asks for.
export type ClinicalHistory =
    | { access: 'denied' }
    | { access: 'reason_required' }
    | {
          access: 'open';
          notes: ClinicalNote[];
          prescriptions: Prescription[];
          vitalSigns: VitalSign[];
          medicalHistory: MedicalHistory;
          trail: Paginated<ClinicalAccessTrailEntry>;
      };

// Asks for the history only when the patient says it will be answered, so a
// patient page never leaves a failed request behind (#272). An exceptional
// access that expired while the patient stayed cached answers 409: the page
// asks for the reason again instead of failing.
//
// Every read the API answers is logged (ADR 0022), unless the same membership
// made the same read within the last 15 minutes (READ_REPEAT_MINUTES). So
// arriving at the page (`fresh`) asks for the notes, the medication, the
// measurements and the background again
// instead of showing a cached copy: each visit past that span leaves its read. Paging the trail or reloading after
// a mutation reuses them, so paging doesn't push new reads onto the trail it
// pages. The trail comes last, so it already holds the reads just logged.
export async function loadClinicalHistory(
    queryClient: QueryClient,
    patient: PatientDetail,
    { trailPage, fresh }: { trailPage: number; fresh: boolean },
): Promise<ClinicalHistory> {
    if (!patient.can_view_clinical_notes) {
        return { access: 'denied' };
    }

    if (patient.clinical_access_reason_required) {
        return { access: 'reason_required' };
    }

    try {
        const [notes, prescriptions, vitalSigns, medicalHistory] =
            await Promise.all([
                readHistory(
                    queryClient,
                    patientClinicalNotesQueryOptions(patient.id),
                    fresh,
                ),
                readHistory(
                    queryClient,
                    patientPrescriptionsQueryOptions(patient.id),
                    fresh,
                ),
                readHistory(
                    queryClient,
                    patientVitalSignsQueryOptions(patient.id),
                    fresh,
                ),
                readHistory(
                    queryClient,
                    patientMedicalHistoryQueryOptions(patient.id),
                    fresh,
                ),
            ]);
        const trail = await loadClinicalAccessTrail(
            queryClient,
            patient.id,
            trailPage,
        );

        return {
            access: 'open',
            notes,
            prescriptions,
            vitalSigns,
            medicalHistory,
            trail,
        };
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

function readHistory<TData, TQueryKey extends QueryKey>(
    queryClient: QueryClient,
    options: FetchQueryOptions<TData, Error, TData, TQueryKey>,
    fresh: boolean,
): Promise<TData> {
    return fresh
        ? queryClient.fetchQuery({ ...options, staleTime: 0 })
        : queryClient.ensureQueryData(options);
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
            patientVitalSignsQueryKey(patientId),
            patientMedicalHistoryQueryKey(patientId),
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
