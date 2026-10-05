import type { AppointmentStatus } from '@/types/appointment';

// The single status -> label/color map for every view that shows an
// appointment status (#235). Colors are the `--status-*` tokens of
// @clini/theme; the shape mirrors apps/landing/src/lib/appointment-status.ts.

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Llegó',
    completed: 'Completado',
    no_show: 'Ausente',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
};

export type ToneStyle = {
    /** Appointment block: soft fill plus the strong color for its left bar. */
    block: string;
    /** Label text in the strong color. */
    text: string;
    dot: string;
    /** Soft pill for chips on a neutral surface. */
    pill: string;
};

// Spelled out, never built from the token name, so Tailwind's scanner sees
// every class name in full.
const SCHEDULED: ToneStyle = {
    block: 'border-status-scheduled bg-status-scheduled-wash',
    text: 'text-status-scheduled',
    dot: 'bg-status-scheduled',
    pill: 'bg-status-scheduled-wash text-status-scheduled',
};

export const STATUS_TONES: Record<AppointmentStatus, ToneStyle> = {
    scheduled: SCHEDULED,
    confirmed: {
        block: 'border-status-confirmed bg-status-confirmed-wash',
        text: 'text-status-confirmed',
        dot: 'bg-status-confirmed',
        pill: 'bg-status-confirmed-wash text-status-confirmed',
    },
    arrived: {
        block: 'border-status-arrived bg-status-arrived-wash',
        text: 'text-status-arrived',
        dot: 'bg-status-arrived',
        pill: 'bg-status-arrived-wash text-status-arrived',
    },
    completed: {
        block: 'border-status-completed bg-status-completed-wash',
        text: 'text-status-completed',
        dot: 'bg-status-completed',
        pill: 'bg-status-completed-wash text-status-completed',
    },
    no_show: {
        block: 'border-status-no-show bg-status-no-show-wash',
        text: 'text-status-no-show',
        dot: 'bg-status-no-show',
        pill: 'bg-status-no-show-wash text-status-no-show',
    },
    // A cancelled or rescheduled appointment no longer holds its slot: gray
    // like `scheduled`, with its label struck through (STRUCK_STATUSES).
    cancelled: SCHEDULED,
    rescheduled: SCHEDULED,
};

/** Statuses whose label (and patient name, in the agenda) is struck through. */
export const STRUCK_STATUSES: AppointmentStatus[] = [
    'cancelled',
    'rescheduled',
];

/** Not a status: marks an appointment booked online (`appointments.origin`). */
export const ONLINE_TONE: ToneStyle = {
    block: 'border-status-online bg-status-online-wash',
    text: 'text-status-online',
    dot: 'bg-status-online',
    pill: 'bg-status-online-wash text-status-online',
};

export const ONLINE_LABEL = 'Reserva online';

/** Statuses shown in the agenda legend, in lifecycle order. */
export const LEGEND_STATUSES: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
    'arrived',
    'completed',
    'no_show',
];
