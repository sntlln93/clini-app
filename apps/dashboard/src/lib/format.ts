/**
 * Every platform aggregate is bucketed in this timezone. Must equal the API's
 * `ADMIN_REPORTING_TIMEZONE` (`config('admin.reporting_timezone')`), which also
 * bounds the grace-extension date: a mismatch makes the two disagree near
 * midnight. See docs/architecture/infrastructure.md.
 */
export const REPORTING_TIMEZONE = 'America/Argentina/Buenos_Aires';

const LOCALE = 'es-AR';
const EMPTY = '—';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: REPORTING_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: REPORTING_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

const percentFormatter = new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
});

/** An ISO timestamp as a reporting-timezone date ("04/10/2026"); `null` → "—". */
export function formatDate(iso: string | null): string {
    return iso ? dateFormatter.format(new Date(iso)) : EMPTY;
}

/** An ISO timestamp as a reporting-timezone date and time ("04/10/2026, 12:00"); `null` → "—". */
export function formatDateTime(iso: string | null): string {
    return iso ? dateTimeFormatter.format(new Date(iso)) : EMPTY;
}

/** A local `Y-m-d` date ("2026-10-04") as "04/10/2026", without any timezone shift. */
export function formatLocalDate(ymd: string): string {
    const [year, month, day] = ymd.split('-');

    return `${day}/${month}/${year}`;
}

/** A local `Y-m-d` date as a compact axis label ("4 oct"). */
export function formatShortDay(ymd: string): string {
    return shortDayFormatter.format(new Date(`${ymd}T00:00:00Z`));
}

/** Whole pesos, no decimals: `15000` → "$ 15.000". */
export function formatCurrencyARS(amount: number, currency = 'ARS'): string {
    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    }).format(amount);
}

/** A 0..1 rate as a percentage ("10,3%"); `null` (no denominator) → "—". */
export function formatPercent(rate: number | null): string {
    return rate === null ? EMPTY : percentFormatter.format(rate);
}

export function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

/** Today's `Y-m-d` in the reporting timezone, shifted by `offsetDays`. */
export function reportingDateOffset(
    offsetDays: number,
    now = new Date(),
): string {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: REPORTING_TIMEZONE,
    }).format(now);

    return shiftDate(today, offsetDays);
}

/** A `Y-m-d` calendar date shifted by `days` (no timezone involved). */
export function shiftDate(ymd: string, days: number): string {
    const date = new Date(`${ymd}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}
