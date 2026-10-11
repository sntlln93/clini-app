const MAX_RANGE_DAYS = 366;
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

/** The first day of the month two months before `to`: the API's default "Desde". */
export function defaultFrom(to: string): string {
    const [year, month] = to.split('-').map(Number);

    return new Date(Date.UTC(year, month - 3, 1)).toISOString().slice(0, 10);
}

/**
 * Validates the range the API will actually use: an empty "Hasta" is today
 * and an empty "Desde" is the first day of the month two months earlier,
 * the defaults `ShowReportRequest` fills in before validating.
 */
export function effectiveRangeError(
    range: { from?: string; to?: string },
    today: string,
): string | null {
    const to = range.to || today;
    const from = range.from || defaultFrom(to);
    const error = rangeError(from, to);

    if (error === null || range.to) {
        return error;
    }

    return to < from
        ? 'Sin “Hasta”, el rango termina hoy: “Desde” no puede ser posterior a hoy.'
        : `Sin “Hasta”, el rango termina hoy y no puede superar los ${MAX_RANGE_DAYS} días.`;
}
