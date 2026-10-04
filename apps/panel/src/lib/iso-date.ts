/** Today's calendar date (YYYY-MM-DD) in `timeZone`, regardless of the browser's own zone. */
export function todayInTimeZone(
    timeZone: string,
    now: Date = new Date(),
): string {
    // `en-CA` formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

/** Calendar arithmetic on a YYYY-MM-DD string, done in UTC so no zone offset can shift the day. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

/** e.g. "2026-10-05" → "lunes, 5 de octubre". */
export function formatLongIsoDate(isoDate: string): string {
    return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(new Date(`${isoDate}T00:00:00Z`));
}
