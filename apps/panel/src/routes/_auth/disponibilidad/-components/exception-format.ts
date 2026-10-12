import {
    type DateTime,
    formatShortDay,
    formatTime,
    fromInstant,
    isSameDay,
} from '@/lib/datetime';

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

export function isExceptionFinished(endIso: string, now: DateTime): boolean {
    return fromInstant(endIso) < now;
}
