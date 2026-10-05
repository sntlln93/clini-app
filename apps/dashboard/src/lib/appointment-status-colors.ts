import type { AppointmentOrigin, AppointmentStatus } from '@/types/stats';

// Same status colors as the panel's agenda (#235), from the `--status-*`
// tokens of @clini/theme. Cancelled and rescheduled no longer hold their slot
// and take the neutral `scheduled` gray, as in the panel.
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
    scheduled: 'var(--status-scheduled)',
    confirmed: 'var(--status-confirmed)',
    arrived: 'var(--status-arrived)',
    completed: 'var(--status-completed)',
    no_show: 'var(--status-no-show)',
    cancelled: 'var(--status-scheduled)',
    rescheduled: 'var(--status-scheduled)',
};

// Online bookings use the amber origin mark the panel shows; manual ones the
// first chart color.
export const APPOINTMENT_ORIGIN_COLORS: Record<AppointmentOrigin, string> = {
    online: 'var(--status-online)',
    manual: 'var(--chart-1)',
};
