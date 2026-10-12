import { DateTime, Info, Settings, SystemZone } from 'luxon';

// The panel's only door to Luxon (ESLint enforces it), so the settings below apply to every import.
export { DateTime };

// Invalid input throws instead of rendering "Invalid DateTime", and lets the types drop `| null`.
declare module 'luxon' {
    interface TSSettings {
        throwOnInvalid: true;
    }
}

Settings.throwOnInvalid = true;
Settings.defaultLocale = 'es-AR';

/**
 * Makes `zone` Luxon's default, so every DateTime the panel parses or builds
 * reads in the practice's zone (`organizations.timezone`), never the
 * browser's (#265). Set from the session before any guarded page loads; with
 * no organization (or an unknown zone) it falls back to the browser's.
 */
export function setPracticeTimeZone(zone: string | null | undefined): void {
    Settings.defaultZone = zone && Info.isValidIANAZone(zone) ? zone : 'system';
}

/** The browser's own zone — only for proposing a zone for a new practice. */
export function browserTimeZone(): string {
    return SystemZone.instance.name;
}

/** An API instant (ISO 8601 with offset), in the practice's zone. */
export function fromInstant(iso: string): DateTime {
    return DateTime.fromISO(iso);
}

/** What the API receives for an instant: ISO 8601 in UTC, e.g. `2026-10-12T12:00:00.000Z`. */
export function toInstant(dateTime: DateTime): string {
    return dateTime.toUTC().toISO();
}

/** Midnight of a YYYY-MM-DD calendar date, in the practice's zone. */
export function fromCalendarDate(isoDate: string): DateTime {
    return DateTime.fromISO(isoDate).startOf('day');
}

export function toCalendarDate(dateTime: DateTime): string {
    return dateTime.toISODate();
}

/** A date input plus a time input (`HH:mm`), read as wall-clock time in the practice's zone. */
export function fromDateAndTime(date: string, time: string): DateTime {
    return DateTime.fromISO(`${date}T${time}`);
}

/** The value a `<input type="time">` shows for `dateTime`. */
export function toTimeInputValue(dateTime: DateTime): string {
    return dateTime.toFormat('HH:mm');
}

/** The value a `<input type="datetime-local">` shows for an API instant, in the practice's zone. */
export function toDateTimeInputValue(iso: string): string {
    return fromInstant(iso).toFormat("yyyy-MM-dd'T'HH:mm");
}

/** An API instant for a `<input type="datetime-local">` value, read in the practice's zone. */
export function fromDateTimeInputValue(value: string): string {
    return toInstant(DateTime.fromISO(value));
}

/** Same calendar day in the practice's zone. */
export function isSameDay(a: DateTime, b: DateTime): boolean {
    return a.hasSame(b, 'day');
}

/** The Sunday that starts `dateTime`'s week (the agenda's weeks run Sunday to Saturday). */
export function startOfWeek(dateTime: DateTime): DateTime {
    return dateTime.startOf('day').minus({ days: dateTime.weekday % 7 });
}

/** e.g. "lun 12 oct": Intl's short form without its dots and comma. */
export function formatShortDay(dateTime: DateTime): string {
    return dateTime
        .toLocaleString({ weekday: 'short', day: 'numeric', month: 'short' })
        .replaceAll('.', '')
        .replace(',', '');
}

/** e.g. "09:00", 24-hour. */
export function formatTime(dateTime: DateTime): string {
    return dateTime.toLocaleString({
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/** e.g. "12/10/26, 09:00" — an API instant in Intl's short date and time. */
export function formatShortDateTime(iso: string): string {
    return fromInstant(iso).toLocaleString({
        dateStyle: 'short',
        timeStyle: 'short',
    });
}
