// The appointment statuses the landing shows, with the colors from the
// visual system (#235). `online` is not a status: it marks where the booking
// came from (appointments.origin), and is shown in the same way.
export type AppointmentTone =
    'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'online';

type ToneStyle = {
    label: string;
    /** Appointment block: soft fill plus a strong left bar. */
    block: string;
    /** Text and dot in the strong color. */
    text: string;
    dot: string;
    /** Soft pill (steps, chips on a neutral surface). */
    pill: string;
};

export const APPOINTMENT_TONES: Record<AppointmentTone, ToneStyle> = {
    scheduled: {
        label: 'Agendado',
        block: 'border-status-scheduled bg-status-scheduled-wash',
        text: 'text-status-scheduled',
        dot: 'bg-status-scheduled',
        pill: 'bg-status-scheduled-wash text-status-scheduled',
    },
    confirmed: {
        label: 'Confirmado',
        block: 'border-status-confirmed bg-status-confirmed-wash',
        text: 'text-status-confirmed',
        dot: 'bg-status-confirmed',
        pill: 'bg-status-confirmed-wash text-status-confirmed',
    },
    arrived: {
        label: 'Llegó',
        block: 'border-status-arrived bg-status-arrived-wash',
        text: 'text-status-arrived',
        dot: 'bg-status-arrived',
        pill: 'bg-status-arrived-wash text-status-arrived',
    },
    completed: {
        label: 'Completado',
        block: 'border-status-completed bg-status-completed-wash',
        text: 'text-status-completed',
        dot: 'bg-status-completed',
        pill: 'bg-status-completed-wash text-status-completed',
    },
    no_show: {
        label: 'Ausente',
        block: 'border-status-no-show bg-status-no-show-wash',
        text: 'text-status-no-show',
        dot: 'bg-status-no-show',
        pill: 'bg-status-no-show-wash text-status-no-show',
    },
    online: {
        label: 'Reserva online',
        block: 'border-status-online bg-status-online-wash',
        text: 'text-status-online',
        dot: 'bg-status-online',
        pill: 'bg-status-online-wash text-status-online',
    },
};

export const LEGEND_ORDER: AppointmentTone[] = [
    'scheduled',
    'confirmed',
    'arrived',
    'completed',
    'no_show',
    'online',
];
