// Where a new record of the clinical history goes: on one of the
// professional's appointments, or, with a null `id`, outside one, on the
// patient (#382, ADR 0037). The agenda passes its whole `Appointment`.
export type RecordAppointment = { id: number | null; patient_id: number };

// The endpoint that lists, reads or records `records` there: the
// appointment's, or the patient's outside an appointment.
export function recordsPath(
    appointment: RecordAppointment,
    records: string,
): string {
    return appointment.id === null
        ? `/patients/${appointment.patient_id}/${records}`
        : `/appointments/${appointment.id}/${records}`;
}

// A record with a null appointment was made outside one (#382): the history,
// the access trail and the export say so.
export const OUTSIDE_APPOINTMENT_LABEL = 'Fuera de un turno';

// Beside a record's date in the history: « · Fuera de un turno» for one made
// outside an appointment, nothing for one made on an appointment.
export function outsideAppointmentSuffix(appointmentId: number | null): string {
    return appointmentId === null ? ` · ${OUTSIDE_APPOINTMENT_LABEL}` : '';
}
