import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { ClinicalNote } from '@/types/clinical-note';
import { queryOptions, useMutation } from '@tanstack/react-query';
import { patientAppointmentsQueryKey } from './use-patient-appointments';

export function patientClinicalNotesQueryKey(patientId: number) {
    return ['patients', patientId, 'clinical-notes'];
}

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
export function patientClinicalNotesQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientClinicalNotesQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: ClinicalNote[] }>(
                    `/patients/${patientId}/clinical-notes`,
                )
                .then((response) => response.data.data),
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
        mutationFn: (body: string) =>
            api.post(`/appointments/${appointmentId}/clinical-notes`, {
                body,
            }),
        onSuccess: () =>
            refreshPageData(
                patientClinicalNotesQueryKey(patientId),
                patientAppointmentsQueryKey(patientId),
            ),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
