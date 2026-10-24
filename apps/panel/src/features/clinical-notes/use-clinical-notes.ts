import {
    patientClinicalNotesQueryKey,
    patientQueryOptions,
} from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote, NoteDraft } from '@/types/clinical-note';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// What the notes' writes read of their appointment: the agenda passes its
// whole `Appointment`, the patient page the id and the patient it has.
export type NoteAppointment = Pick<Appointment, 'id' | 'patient_id'>;

function queryKey(appointmentId: number | null) {
    return ['clinical-notes', appointmentId];
}

// Interaction-triggered read (ADR 0007 exception): the dialog opens on demand
// from `AppointmentCard` or the patient page, never from a route loader.
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
function useRefreshNotes(appointment: NoteAppointment | null) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return async () => {
        const dialogKey = queryKey(appointment?.id ?? null);

        // The patient goes too: it says whether the notes take a reason
        // (#325), and a stale one would ask for them after the access ran out.
        if (appointment) {
            discardPageData(
                queryClient,
                patientQueryOptions(appointment.patient_id).queryKey,
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

export function useCreateClinicalNote(appointment: NoteAppointment | null) {
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
export function useAmendClinicalNote(appointment: NoteAppointment | null) {
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

export function useAnnulClinicalNote(appointment: NoteAppointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            api.post(`/clinical-notes/${id}/annulment`, { reason }),
        onSuccess: refreshNotes,
    });
}
