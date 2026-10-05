import { reportingDateOffset, shiftDate } from '@/lib/format';

const MAX_RANGE_DAYS = 366;
const DEFAULT_SPAN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Client-side mirror of the API's range rules, so an invalid range never leaves the form; `null` = valid. */
export function rangeError(
    from: string | undefined,
    to: string | undefined,
): string | null {
    if (!from || !to) {
        return null;
    }

    if (to < from) {
        return 'La fecha “Hasta” tiene que ser igual o posterior a “Desde”.';
    }

    const spanDays =
        (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
            DAY_MS +
        1;

    return spanDays > MAX_RANGE_DAYS
        ? `El rango no puede superar los ${MAX_RANGE_DAYS} días.`
        : null;
}

/**
 * Validates the range the API will actually use: an empty "Hasta" is today
 * (reporting timezone) and an empty "Desde" is 30 days up to "Hasta", the
 * defaults `StatsRequest` fills in before validating.
 */
export function effectiveRangeError(
    range: { from?: string; to?: string },
    today: string = reportingDateOffset(0),
): string | null {
    const to = range.to || today;
    const from = range.from || shiftDate(to, -(DEFAULT_SPAN_DAYS - 1));
    const error = rangeError(from, to);

    if (error === null || range.to) {
        return error;
    }

    return to < from
        ? 'Sin “Hasta”, el rango termina hoy: “Desde” no puede ser posterior a hoy.'
        : `Sin “Hasta”, el rango termina hoy y no puede superar los ${MAX_RANGE_DAYS} días.`;
}
