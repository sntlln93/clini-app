import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';

// Resends the appointment's access code to one of the patient's confirmed
// emails, at the patient's request (#364, ADR 0029). Nothing on screen
// changes: whoever sends it never sees the code.
export function useResendAccessCode(appointmentId: number) {
    return useMutation({
        mutationFn: (contactId: number) =>
            api.post(`/appointments/${appointmentId}/access-code-deliveries`, {
                contact_id: contactId,
            }),
        onSuccess: () => notifySuccess('Le enviamos el código al paciente.'),
    });
}
