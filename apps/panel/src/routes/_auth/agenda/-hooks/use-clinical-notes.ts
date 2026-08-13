import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
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

export function useCreateClinicalNote(appointmentId: number | null) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (body: string) =>
            api.post(`/appointments/${appointmentId}/clinical-notes`, {
                body,
            }),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKey(appointmentId),
            }),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateClinicalNote(appointmentId: number | null) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: string }) =>
            api.patch(`/clinical-notes/${id}`, { body }),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKey(appointmentId),
            }),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useDeleteClinicalNote(appointmentId: number | null) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (id: number) => api.delete(`/clinical-notes/${id}`),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKey(appointmentId),
            }),
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
