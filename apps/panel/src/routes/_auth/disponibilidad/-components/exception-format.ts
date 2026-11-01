import type { StatusTone } from '@/components/StatusPill';
import {
    type DateTime,
    formatDayMonth,
    formatDayMonthYear,
    formatShortDay,
    formatTime,
    formatWeekdayDay,
    fromInstant,
    isSameDay,
    isStartOfDay,
} from '@/lib/datetime';
import type {
    AvailabilityException,
    AvailabilityExceptionType,
} from '@/types/availability';

export const EXCEPTION_TYPE_LABELS: Record<AvailabilityExceptionType, string> =
    {
        blocked: 'Sin atención',
        extra: 'Horas adicionales',
    };

export const EXCEPTION_TYPE_TONES: Record<
    AvailabilityExceptionType,
    StatusTone
> = {
    blocked: 'warning',
    extra: 'success',
};

/** Both ends at the practice's midnight: whole days, stored as [first day 00:00, day after the last 00:00). */
export function isAllDayRange(start: DateTime, end: DateTime): boolean {
    return isStartOfDay(start) && isStartOfDay(end);
}

/** Calendar days between two midnights (DST-safe: Luxon's day unit is calendar based). */
export function wholeDaysBetween(start: DateTime, end: DateTime): number {
    return Math.round(end.diff(start, 'days').days);
}

/** The last day an exception touches: for an all-day range, the day before its end. */
function lastDay(start: DateTime, end: DateTime): DateTime {
    return isAllDayRange(start, end) ? end.minus({ days: 1 }) : end;
}

/** "12 nov 2026", "4 – 15 ene 2027", "28 nov – 3 dic 2026", "28 dic 2026 – 3 ene 2027". */
export function formatExceptionDates(startIso: string, endIso: string): string {
    const start = fromInstant(startIso);
    const last = lastDay(start, fromInstant(endIso));

    if (isSameDay(start, last)) {
        return formatDayMonthYear(start);
    }
    if (start.hasSame(last, 'month')) {
        return `${start.day} – ${formatDayMonthYear(last)}`;
    }
    if (start.hasSame(last, 'year')) {
        return `${formatDayMonth(start)} – ${formatDayMonthYear(last)}`;
    }

    return `${formatDayMonthYear(start)} – ${formatDayMonthYear(last)}`;
}

/** "Todo el día", "12 días", "09:00 – 12:00" or "lun 4, 14:00 – mié 6, 12:00". */
export function formatExceptionDetail(
    startIso: string,
    endIso: string,
): string {
    const start = fromInstant(startIso);
    const end = fromInstant(endIso);

    if (isAllDayRange(start, end)) {
        const days = wholeDaysBetween(start, end);
        return days === 1 ? 'Todo el día' : `${days} días`;
    }
    if (isSameDay(start, end)) {
        return `${formatTime(start)} – ${formatTime(end)}`;
    }

    return `${formatWeekdayDay(start)}, ${formatTime(start)} – ${formatWeekdayDay(end)}, ${formatTime(end)}`;
}

/**
 * The practice's local range for an exception, e.g. "lun 12 oct, 09:00 – 13:00",
 * or "lun 12 oct, 09:00 – mié 14 oct, 18:00" when it spans several days.
 */
export function formatExceptionRange(startIso: string, endIso: string): string {
    const start = fromInstant(startIso);
    const end = fromInstant(endIso);
    const startLabel = `${formatShortDay(start)}, ${formatTime(start)}`;

    if (isSameDay(start, end)) {
        return `${startLabel} – ${formatTime(end)}`;
    }

    return `${startLabel} – ${formatShortDay(end)}, ${formatTime(end)}`;
}

/** The exceptions still running or ahead (soonest first) and the finished ones (latest first). */
export function splitExceptions(
    exceptions: AvailabilityException[],
    now: DateTime,
): { upcoming: AvailabilityException[]; past: AvailabilityException[] } {
    const byStart = (a: AvailabilityException, b: AvailabilityException) =>
        fromInstant(a.start_at).toMillis() - fromInstant(b.start_at).toMillis();
    const upcoming = exceptions.filter(
        (exception) => fromInstant(exception.end_at) >= now,
    );
    const past = exceptions.filter(
        (exception) => fromInstant(exception.end_at) < now,
    );

    return {
        upcoming: upcoming.sort(byStart),
        past: past.sort((a, b) => byStart(b, a)),
    };
}
