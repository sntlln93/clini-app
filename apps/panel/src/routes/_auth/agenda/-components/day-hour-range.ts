import { type DateTime, fromInstant, isSameDay } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;

/** The day grid's hour span: 8–20 by default, widened to fit every appointment starting on `date` (an end past midnight clamps to 24). */
export function dayHourRange(
    appointments: Appointment[],
    date: DateTime,
): { startHour: number; endHour: number } {
    let startHour = DEFAULT_START_HOUR;
    let endHour = DEFAULT_END_HOUR;

    for (const appointment of appointments) {
        const start = fromInstant(appointment.start_at);
        if (!isSameDay(start, date)) {
            continue;
        }

        const end = fromInstant(appointment.end_at);
        const endsOnDay = isSameDay(end, date);
        const lastHour = endsOnDay ? end.hour + (end.minute > 0 ? 1 : 0) : 24;

        startHour = Math.min(startHour, start.hour);
        endHour = Math.max(endHour, Math.min(lastHour, 24));
    }

    return { startHour, endHour };
}
