import { patientAppointmentsQueryKey } from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { DateTime, fromInstant, isSameDay } from '@/lib/datetime';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

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
    return isSameDay(fromInstant(iso), DateTime.now());
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

const UPCOMING_STATUSES = new Set<PatientAppointmentHistoryItem['status']>([
    'scheduled',
    'confirmed',
    'arrived',
]);

// The history only carries the active organization's appointments (the
// API's organization scope), so every item here is reachable in the agenda.
// Keyed off `end_at` so an appointment in progress still counts as upcoming.
export function findNextAppointment(
    appointments: PatientAppointmentHistoryItem[],
    now: DateTime = DateTime.now(),
): PatientAppointmentHistoryItem | null {
    let next: PatientAppointmentHistoryItem | null = null;

    for (const appointment of appointments) {
        if (
            !UPCOMING_STATUSES.has(appointment.status) ||
            fromInstant(appointment.end_at) < now
        ) {
            continue;
        }

        if (
            next === null ||
            fromInstant(appointment.start_at) < fromInstant(next.start_at)
        ) {
            next = appointment;
        }
    }

    return next;
}
