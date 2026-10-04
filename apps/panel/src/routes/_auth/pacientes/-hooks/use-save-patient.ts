import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { notifySuccess } from '@/lib/toast';
import type { Patient, PatientPayload } from '@/types/patient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { patientQueryOptions } from './use-patient';

export function useSavePatient(patientId?: number) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (payload: PatientPayload) =>
            patientId
                ? api
                      .put<{ data: Patient }>(`/patients/${patientId}`, payload)
                      .then((response) => response.data.data)
                : api
                      .post<{ data: Patient }>('/patients', payload)
                      .then((response) => response.data.data),
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            // List pages are read only by the list loader's `ensureQueryData`, which
            // serves an invalidated entry as-is; dropping them makes going back refetch.
            queryClient.removeQueries({
                queryKey: ['patients'],
                predicate: (query) => typeof query.queryKey[1] === 'object',
            });
            // The save response omits `insurance_provider`, so it can't seed the detail cache;
            // dropping the entry makes the detail loader's `ensureQueryData` fetch it fresh.
            queryClient.removeQueries({
                queryKey: patientQueryOptions(saved.id).queryKey,
                exact: true,
            });
            notifySuccess(patientId ? 'Cambios guardados' : 'Paciente creado');

            // `saved.id` also covers a create that reused an existing patient by document.
            return navigate({
                to: '/pacientes/$id',
                params: { id: saved.id },
            });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
