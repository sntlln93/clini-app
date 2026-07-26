import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { Patient, PatientPayload } from '@/types/patient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            navigate({ to: '/pacientes' });
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
