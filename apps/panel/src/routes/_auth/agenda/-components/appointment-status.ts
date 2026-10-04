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

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Llegó',
    completed: 'Completado',
    no_show: 'Ausente',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
};

export const STATUS_VARIANTS: Record<
    AppointmentStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    scheduled: 'outline',
    confirmed: 'secondary',
    arrived: 'secondary',
    completed: 'default',
    no_show: 'destructive',
    cancelled: 'destructive',
    rescheduled: 'outline',
};

// Solid per-status surface for the `day` variant only; `default` (week view) keeps its translucent look unchanged.
export const STATUS_DAY_STYLES: Record<AppointmentStatus, string> = {
    scheduled: 'border-border bg-background text-foreground',
    confirmed: 'border-transparent bg-secondary text-secondary-foreground',
    arrived: 'border-transparent bg-accent text-accent-foreground',
    completed: 'border-transparent bg-primary text-primary-foreground',
    no_show: 'border-transparent bg-destructive/15 text-destructive',
    cancelled: 'border-transparent bg-destructive/15 text-destructive',
    rescheduled: 'border-border bg-background text-foreground',
};

// Menu copy names the action, not the target state; `STATUS_LABELS` stays the badge copy.
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
