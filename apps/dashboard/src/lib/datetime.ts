import { DateTime, Settings } from 'luxon';

// The dashboard's only door to Luxon (ESLint enforces it), so the settings below apply to every import.
export { DateTime };

// Invalid input throws instead of rendering "Invalid DateTime", and lets the types drop `| null`.
declare module 'luxon' {
    interface TSSettings {
        throwOnInvalid: true;
    }
}

/**
 * Every platform aggregate is bucketed in this timezone. Must equal the API's
 * `ADMIN_REPORTING_TIMEZONE` (`config('admin.reporting_timezone')`), which also
 * bounds the grace-extension date: a mismatch makes the two disagree near
 * midnight. See docs/architecture/infrastructure.md.
 */
export const REPORTING_TIMEZONE = 'America/Argentina/Buenos_Aires';

// The dashboard spans every organization, so it reads instants in the reporting zone, never the browser's (#265).
Settings.throwOnInvalid = true;
Settings.defaultLocale = 'es-AR';
Settings.defaultZone = REPORTING_TIMEZONE;

/** A `Y-m-d` calendar date, in UTC: calendar arithmetic that no zone offset can shift. */
export function utcDay(ymd: string): DateTime {
    return DateTime.fromISO(ymd, { zone: 'utc' });
}
