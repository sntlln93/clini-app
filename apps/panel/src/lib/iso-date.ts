import { DateTime } from './datetime';

/** Today's calendar date (YYYY-MM-DD) in `timeZone`, or in the practice's zone when omitted. */
export function todayInTimeZone(
    timeZone?: string,
    now: DateTime = DateTime.now(),
): string {
    return (timeZone ? now.setZone(timeZone) : now).toISODate();
}

// Pure calendar arithmetic on YYYY-MM-DD strings, done in UTC so no zone offset can shift the day.
function utcDay(isoDate: string): DateTime {
    return DateTime.fromISO(isoDate, { zone: 'utc' });
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
    return utcDay(isoDate).plus({ days }).toISODate();
}

/** e.g. "2026-10-05" → "lunes, 5 de octubre". */
export function formatLongIsoDate(isoDate: string): string {
    return utcDay(isoDate).toLocaleString({
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

/** True for a real YYYY-MM-DD calendar date (rejects e.g. 2026-02-30). */
export function isCalendarDate(isoDate: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return false;
    }

    // Luxon is set to throw on an invalid date instead of flagging it.
    try {
        utcDay(isoDate);
        return true;
    } catch {
        return false;
    }
}
