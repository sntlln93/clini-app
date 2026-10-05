import type { Appointment, AppointmentStatus } from '@/types/appointment';

// Mirrors `AppointmentStatus::allowedTransitions()` in `app/Enums/AppointmentStatus.php` — keep in sync.
export const ALLOWED_TRANSITIONS: Record<
    AppointmentStatus,
    AppointmentStatus[]
> = {
    scheduled: ['confirmed', 'no_show'],
    confirmed: ['arrived', 'no_show'],
    arrived: ['completed'],
    completed: [],
    no_show: [],
    cancelled: [],
    rescheduled: [],
};

// Mirrors `CancelAppointmentAction::CANCELLABLE_STATUSES` — keep in sync.
export const CANCELLABLE_STATUSES: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
    'arrived',
];

// Mirrors `RescheduleAppointmentAction::RESCHEDULABLE_STATUSES` — keep in sync.
export const RESCHEDULABLE_STATUSES: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
];

// Menu copy names the action, not the target state; `STATUS_LABELS` (`@/lib/appointment-status`) stays the chip copy.
export const STATUS_ACTION_LABELS: Partial<Record<AppointmentStatus, string>> =
    {
        confirmed: 'Confirmar turno',
        arrived: 'Marcar llegada',
        completed: 'Marcar como atendido',
        no_show: 'Marcar ausente',
    };

export const STATUS_SUCCESS_MESSAGES: Partial<
    Record<AppointmentStatus, string>
> = {
    confirmed: 'Turno confirmado.',
    arrived: 'Llegada registrada.',
    completed: 'Turno marcado como atendido.',
    no_show: 'Turno marcado como ausente.',
};

// Statuses that no longer hold their slot — mirrors the overlap query in `BookAppointmentAction`; hidden from the agenda by default.
export const INACTIVE_STATUSES: AppointmentStatus[] = [
    'cancelled',
    'rescheduled',
];

/** Presentation-only filter behind the agenda's "Mostrar cancelados" toggle; the API response itself is never narrowed. */
export function filterAgendaAppointments(
    appointments: Appointment[],
    showCancelled: boolean,
): Appointment[] {
    return showCancelled
        ? appointments
        : appointments.filter(
              (appointment) => !INACTIVE_STATUSES.includes(appointment.status),
          );
}
