import { api } from '@/lib/api';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

export function patientAppointmentsQueryKey(patientId: number) {
    return ['patients', patientId, 'appointments'];
}

// Page read (ADR 0007): consumed from the `pacientes/$id` route loader only.
export function patientAppointmentsQueryOptions(patientId: number) {
    return queryOptions({
        queryKey: patientAppointmentsQueryKey(patientId),
        queryFn: () =>
            api
                .get<{ data: PatientAppointmentHistoryItem[] }>(
                    `/patients/${patientId}/appointments`,
                )
                .then((response) => response.data.data),
    });
}

function isToday(iso: string): boolean {
    const date = new Date(iso);
    const now = new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}

// Drives whether "add note" is offered on the patient page (issue #217):
// the acting membership's own appointment for today, excluding cancelled —
// there is no "in-progress appointment" state to key off instead.
export function findTodaysOwnAppointment(
    appointments: PatientAppointmentHistoryItem[],
): PatientAppointmentHistoryItem | null {
    return (
        appointments.find(
            (appointment) =>
                appointment.is_own_membership &&
                appointment.status !== 'cancelled' &&
                isToday(appointment.start_at),
        ) ?? null
    );
}
