import { patientClinicalNotesQueryKey } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
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
        mutationFn: (body: string) =>
            api.post(`/appointments/${appointment?.id}/clinical-notes`, {
                body,
            }),
        onSuccess: refreshNotes,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateClinicalNote(appointment: Appointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    const mutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: string }) =>
            api.patch(`/clinical-notes/${id}`, { body }),
        onSuccess: refreshNotes,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteClinicalNote(appointment: Appointment | null) {
    const refreshNotes = useRefreshNotes(appointment);

    const mutation = useMutation({
        mutationFn: (id: number) => api.delete(`/clinical-notes/${id}`),
        onSuccess: refreshNotes,
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
