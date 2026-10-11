import { patientQueryOptions } from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import { discardPageData } from '@/lib/page-data';
import { notifySuccess } from '@/lib/toast';
import type { Patient, PatientPayload } from '@/types/patient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Where to go next is the caller's call: the patients pages open the saved
// patient; a dialog elsewhere may keep the user where they are.
export function useSavePatient(patientId?: number) {
    const queryClient = useQueryClient();

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
            // Other pages' loader-only reads that show it (#273): appointments
            // (agenda, waiting room) and prescriptions carry the patient's name
            // and document; the reports count the patients registered.
            if (patientId) {
                discardPageData(
                    queryClient,
                    ['appointments'],
                    ['prescriptions', 'patient'],
                    ['prescriptions', 'detail'],
                );
            } else {
                discardPageData(queryClient, ['reports']);
            }
            notifySuccess(patientId ? 'Cambios guardados' : 'Paciente creado');
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
