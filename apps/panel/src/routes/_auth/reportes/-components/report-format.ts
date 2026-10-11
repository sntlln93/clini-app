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
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
});
const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

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
    const [year, month, day] = ymd.split('-');

    return `${day}/${month}/${year}`;
}

/** A `Y-m` month as "sept 2026". */
export function formatMonth(ym: string): string {
    return monthFormatter
        .format(new Date(`${ym}-01T00:00:00Z`))
        .replaceAll('.', '');
}

/** Axis label of a bucket: its first day for a week ("7 sept"), its month otherwise. */
export function formatBucket(
    start: string,
    granularity: ReportGranularity,
): string {
    return granularity === 'week'
        ? shortDayFormatter
              .format(new Date(`${start}T00:00:00Z`))
              .replaceAll('.', '')
        : formatMonth(start.slice(0, 7));
}

/** Full span of a bucket, e.g. "07/09/2026 al 13/09/2026". */
export function formatBucketRange(start: string, end: string): string {
    return start === end
        ? formatLocalDate(start)
        : `${formatLocalDate(start)} al ${formatLocalDate(end)}`;
}
