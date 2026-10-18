import {
    patientAppointmentsQueryKey,
    patientClinicalNotesQueryKey,
} from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import { extractFormErrors } from '@/lib/form-errors';
import { notifySuccess } from '@/lib/toast';
import type { ClinicalNote, NoteDraft } from '@/types/clinical-note';
import { queryOptions, useMutation } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
// Access is decided by relationship, not by a session permission (only a
// membership with an appointment or a note for this patient can read them),
// so the 403 is an expected answer — e.g. right after creating a patient —
// and resolves to `null` instead of failing the whole patient page (#266).
export function patientClinicalNotesQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientClinicalNotesQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: ClinicalNote[] }>(
                    `/patients/${patientId}/clinical-notes`,
                )
                .then((response): ClinicalNote[] | null => response.data.data)
                .catch((error: unknown) => {
                    if (mapToAppError(error).kind === 'forbidden') {
                        return null;
                    }

                    throw error;
                }),
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
