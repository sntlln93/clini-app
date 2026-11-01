// What a 24-hour «HH:MM» field holds while it's typed: only digits and one
// colon, at most two digits per side («9», «173» → «17:3», «0930» → «09:30»).
export function maskClock(raw: string): string {
    if (raw.includes(':')) {
        const [hours, ...rest] = raw.split(':');
        const minutes = rest.join('');

        return `${hours.replace(/\D/g, '').slice(0, 2)}:${minutes.replace(/\D/g, '').slice(0, 2)}`;
    }

    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
        return digits;
    }

    // Three digits split where they read as a time: «173» is 17:3…, «930» is 9:30.
    const hoursLength =
        digits.length === 4 || Number(digits.slice(0, 2)) <= 23 ? 2 : 1;

    return `${digits.slice(0, hoursLength)}:${digits.slice(hoursLength)}`;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * The «HH:MM» a typed text stands for, or null when it isn't a time of day.
 * A bare hour reads as o'clock («9» → «09:00»), and a single minute digit as
 * its tens («9:3» → «09:30»), the way it reads while typing.
 */
export function parseClock(text: string): string | null {
    const masked = maskClock(text);
    if (masked === '' || masked === ':') {
        return null;
    }

    const [hoursText, minutesText = ''] = masked.includes(':')
        ? masked.split(':')
        : [masked];
    if (hoursText === '') {
        return null;
    }

    const hours = Number(hoursText);
    const minutes = Number(minutesText.padEnd(2, '0'));

    return hours < 24 && minutes < 60 ? `${pad(hours)}:${pad(minutes)}` : null;
}

/** «HH:MM» moved by `minutes`, clamped to the day (00:00 to 23:59). */
export function stepClock(clock: string, minutes: number): string {
    const [hours, mins] = clock.split(':').map(Number);
    const total = Math.min(
        Math.max(hours * 60 + mins + minutes, 0),
        23 * 60 + 59,
    );

    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
