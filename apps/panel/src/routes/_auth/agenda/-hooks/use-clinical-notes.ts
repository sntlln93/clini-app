import { patientClinicalNotesQueryKey } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote, NoteDraft } from '@/types/clinical-note';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function queryKey(appointmentId: number | null) {
    return ['clinical-notes', appointmentId];
}

// Interaction-triggered read (ADR 0007 exception): the dialog opens on demand
// from `AppointmentCard`, never from a route loader.
export function useClinicalNotes(appointmentId: number | null, open: boolean) {
    return useQuery({
        queryKey: queryKey(appointmentId),
        queryFn: () =>
            api
                .get<{ data: ClinicalNote[] }>(
                    `/appointments/${appointmentId}/clinical-notes`,
                )
                .then((response) => response.data.data),
        enabled: open && appointmentId !== null,
    });
}

// The dialog's own list, plus the patient page's notes (#273).
function useRefreshNotes(appointment: Appointment | null) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return async () => {
        const dialogKey = queryKey(appointment?.id ?? null);

        if (appointment) {
            discardPageData(
                queryClient,
                patientClinicalNotesQueryKey(appointment.patient_id),
            );
        }

        // The dialog's first load can still be in flight, sent before the
        // save: a refetch would join it (no data yet to cancel it for) and
        // keep its answer, so it is cancelled first. Only the dialog reads it.
        await queryClient.cancelQueries({ queryKey: dialogKey });

        return refreshPageData(dialogKey);
    };
}

export function useCreateClinicalNote(appointment: Appointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    const mutation = useMutation({
        mutationFn: ({ body, icd10CodeIds }: NoteDraft) =>
            api.post(`/appointments/${appointment?.id}/clinical-notes`, {
                body,
                icd10_code_ids: icd10CodeIds,
            }),
        onSuccess: refreshNotes,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

// A note is never edited or deleted (#323): the author amends it, which
// keeps every earlier version, or annuls it, which keeps it marked as void.
export function useAmendClinicalNote(appointment: Appointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    const mutation = useMutation({
        mutationFn: ({
            id,
            body,
            icd10CodeIds,
            reason,
        }: NoteDraft & {
            id: number;
            reason: string | null;
        }) =>
            api.post(`/clinical-notes/${id}/amendments`, {
                body,
                icd10_code_ids: icd10CodeIds,
                reason,
            }),
        onSuccess: refreshNotes,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useAnnulClinicalNote(appointment: Appointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            api.post(`/clinical-notes/${id}/annulment`, { reason }),
        onSuccess: refreshNotes,
    });
}
