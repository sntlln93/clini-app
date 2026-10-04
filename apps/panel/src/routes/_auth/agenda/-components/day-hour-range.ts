import type { Appointment } from '@/types/appointment';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/** The day grid's hour span: 8–20 by default, widened to fit every appointment starting on `date` (an end past midnight clamps to 24). */
export function dayHourRange(
    appointments: Appointment[],
    date: Date,
): { startHour: number; endHour: number } {
    let startHour = DEFAULT_START_HOUR;
    let endHour = DEFAULT_END_HOUR;

    for (const appointment of appointments) {
        const start = new Date(appointment.start_at);
        if (!isSameDay(start, date)) {
            continue;
        }

        const end = new Date(appointment.end_at);
        const endsOnDay = isSameDay(end, date);
        const lastHour = endsOnDay
            ? end.getHours() + (end.getMinutes() > 0 ? 1 : 0)
            : 24;

        startHour = Math.min(startHour, start.getHours());
        endHour = Math.max(endHour, Math.min(lastHour, 24));
    }

    return { startHour, endHour };
}
