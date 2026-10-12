import { formatShortDay, formatTime, fromInstant } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';

/** e.g. "lunes 3 de agosto a las 10:00" — for success toasts. */
export function formatAppointmentMoment(iso: string): string {
    const date = fromInstant(iso);
    const day = date
        .toLocaleString({ weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
    return `${day} a las ${formatTime(date)}`;
}

/** e.g. "Turno de Juan Pérez con Ana López · lun 3 ago, 10:00" — identifies the appointment a dialog acts on. */
export function describeAppointment(appointment: Appointment): string {
    const date = fromInstant(appointment.start_at);
    const patient =
        appointment.patient_name ?? `Paciente #${appointment.patient_id}`;
    const professional = appointment.professional_name
        ? ` con ${appointment.professional_name}`
        : '';

    return `Turno de ${patient}${professional} · ${formatShortDay(date)}, ${formatTime(date)}`;
}

/** e.g. "Obra social informada: OSDE · N° 61234567801" — what the patient said when booking online (#291), or null. */
export function describeReportedInsurance(
    appointment: Appointment,
): string | null {
    if (
        appointment.reported_insurance_provider_id === null ||
        !appointment.reported_insurance_provider_name
    ) {
        return null;
    }

    const memberNumber = appointment.reported_insurance_member_number
        ? ` · N° ${appointment.reported_insurance_member_number}`
        : '';

    return `Obra social informada: ${appointment.reported_insurance_provider_name}${memberNumber}`;
}
