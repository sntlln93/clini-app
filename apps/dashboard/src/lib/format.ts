import { DateTime, utcDay } from '@/lib/datetime';

export { REPORTING_TIMEZONE } from '@/lib/datetime';

const LOCALE = 'es-AR';
const EMPTY = '—';

const numberFormatter = new Intl.NumberFormat(LOCALE);

const percentFormatter = new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
});

/** An ISO timestamp as a reporting-timezone date ("04/10/2026"); `null` → "—". */
export function formatDate(iso: string | null): string {
    return iso ? DateTime.fromISO(iso).toFormat('dd/MM/yyyy') : EMPTY;
}

/** An ISO timestamp as a reporting-timezone date and time ("04/10/2026, 12:00"); `null` → "—". */
export function formatDateTime(iso: string | null): string {
    return iso
        ? DateTime.fromISO(iso).toLocaleString({
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          })
        : EMPTY;
}

/** A local `Y-m-d` date ("2026-10-04") as "04/10/2026", without any timezone shift. */
export function formatLocalDate(ymd: string): string {
    return utcDay(ymd).toFormat('dd/MM/yyyy');
}

/** A local `Y-m-d` date as a compact axis label ("4 oct"). */
export function formatShortDay(ymd: string): string {
    return utcDay(ymd).toLocaleString({ day: 'numeric', month: 'short' });
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
    now = DateTime.now(),
): string {
    return shiftDate(now.toISODate(), offsetDays);
}

/** A `Y-m-d` calendar date shifted by `days` (no timezone involved). */
export function shiftDate(ymd: string, days: number): string {
    return utcDay(ymd).plus({ days }).toISODate();
}
