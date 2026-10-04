const DAY_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const LOCAL_DAY_KEY = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function formatDay(date: Date): string {
    return DAY_FORMAT.format(date).replaceAll('.', '').replace(',', '');
}

/**
 * Local-time range for an exception, e.g. "lun 12 oct, 09:00 – 13:00", or
 * "lun 12 oct, 09:00 – mié 14 oct, 18:00" when it spans several days.
 */
export function formatExceptionRange(startIso: string, endIso: string): string {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const startLabel = `${formatDay(start)}, ${TIME_FORMAT.format(start)}`;

    if (LOCAL_DAY_KEY.format(start) === LOCAL_DAY_KEY.format(end)) {
        return `${startLabel} – ${TIME_FORMAT.format(end)}`;
    }

    return `${startLabel} – ${formatDay(end)}, ${TIME_FORMAT.format(end)}`;
}

export function isExceptionFinished(endIso: string, now: Date): boolean {
    return new Date(endIso).getTime() < now.getTime();
}
