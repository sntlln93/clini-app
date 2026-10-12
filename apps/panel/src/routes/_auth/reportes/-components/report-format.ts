import { DateTime } from '@/lib/datetime';
import type { ReportGranularity } from '@/types/report';

const LOCALE = 'es-AR';
const EMPTY = '—';

const percentFormatter = new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
});
const hoursFormatter = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 1,
});

// Report buckets are calendar dates, formatted in UTC so no zone offset can move a day.
function utcDay(isoDate: string): DateTime {
    return DateTime.fromISO(isoDate, { zone: 'utc' });
}

/** A 0..1 rate, e.g. 0.4286 → "42,9 %"; null → "—". */
export function formatPercent(rate: number | null): string {
    return rate === null ? EMPTY : percentFormatter.format(rate);
}

/** Minutes as hours, e.g. 90 → "1,5 h". */
export function formatHours(minutes: number): string {
    return `${hoursFormatter.format(minutes / 60)} h`;
}

/** A local `Y-m-d` date as "07/09/2026". */
export function formatLocalDate(ymd: string): string {
    return utcDay(ymd).toFormat('dd/MM/yyyy');
}

/** A `Y-m` month as "sept 2026". */
export function formatMonth(ym: string): string {
    return utcDay(`${ym}-01`)
        .toLocaleString({ month: 'short', year: 'numeric' })
        .replaceAll('.', '');
}

/** Axis label of a bucket: its first day for a week ("7 sept"), its month otherwise. */
export function formatBucket(
    start: string,
    granularity: ReportGranularity,
): string {
    return granularity === 'week'
        ? utcDay(start)
              .toLocaleString({ day: 'numeric', month: 'short' })
              .replaceAll('.', '')
        : formatMonth(start.slice(0, 7));
}

/** Full span of a bucket, e.g. "07/09/2026 al 13/09/2026". */
export function formatBucketRange(start: string, end: string): string {
    return start === end
        ? formatLocalDate(start)
        : `${formatLocalDate(start)} al ${formatLocalDate(end)}`;
}
