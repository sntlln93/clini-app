import {
    patientAppointmentsQueryKey,
    patientClinicalNotesQueryKey,
} from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import { extractFormErrors } from '@/lib/form-errors';
import { notifySuccess } from '@/lib/toast';
import type { ClinicalNote, NoteDraft } from '@/types/clinical-note';
import { queryOptions, useMutation } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
// Access is decided by relationship, not by a session permission, so the
// loader only asks once the patient says the history is open
// (`loadClinicalHistory`, #325): a 403 here is a real error again.
export function patientClinicalNotesQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientClinicalNotesQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: ClinicalNote[] }>(
                    `/patients/${patientId}/clinical-notes`,
                )
                .then((response) => response.data.data),
        // An exceptional access that expired while the patient stayed cached:
        // `loadClinicalHistory` asks for the reason again (#325).
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}

// Reuses the existing appointment-scoped store endpoint and its validation
// (issue #30) — only the success side-effect differs: this page is read via
// loader, so it refreshes through `useRefreshPageData` instead of a plain
// `invalidateQueries`.
export function useCreatePatientClinicalNote(
    patientId: number,
    appointmentId: number | null,
) {
    const refreshPageData = useRefreshPageData();

    const mutation = useMutation({
        mutationFn: ({ body, icd10CodeIds }: NoteDraft) =>
            api.post(`/appointments/${appointmentId}/clinical-notes`, {
                body,
                icd10_code_ids: icd10CodeIds,
            }),
        onSuccess: () =>
            refreshPageData(
                patientClinicalNotesQueryKey(patientId),
                patientAppointmentsQueryKey(patientId),
            ).then(() => notifySuccess('Nota guardada')),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
