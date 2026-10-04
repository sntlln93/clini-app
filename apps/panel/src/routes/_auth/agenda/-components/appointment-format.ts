import type { Appointment } from '@/types/appointment';

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

/** e.g. "lunes 3 de agosto a las 10:00" — for success toasts. */
export function formatAppointmentMoment(iso: string): string {
    const date = new Date(iso);
    const day = LONG_DATE_FORMAT.format(date).replace(',', '');
    return `${day} a las ${TIME_FORMAT.format(date)}`;
}

/** e.g. "Turno de Juan Pérez con Ana López · lun 3 ago, 10:00" — identifies the appointment a dialog acts on. */
export function describeAppointment(appointment: Appointment): string {
    const date = new Date(appointment.start_at);
    const day = SHORT_DATE_FORMAT.format(date)
        .replaceAll('.', '')
        .replace(',', '');
    const patient =
        appointment.patient_name ?? `Paciente #${appointment.patient_id}`;
    const professional = appointment.professional_name
        ? ` con ${appointment.professional_name}`
        : '';

    return `Turno de ${patient}${professional} · ${day}, ${TIME_FORMAT.format(date)}`;
}
