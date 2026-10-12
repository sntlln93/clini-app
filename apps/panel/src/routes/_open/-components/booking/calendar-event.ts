import { DateTime, fromInstant } from '@/lib/datetime';
import type { BookingConfirmation } from '@/types/booking';

/**
 * The booked appointment as a calendar event (#295), built in the browser
 * from the confirmation alone: no endpoint, no patient data. Mirrors the
 * API's `AppointmentCalendarEvent` and `CalendarLink` (the reminder mail's
 * copy of the same event) — keep the two in sync.
 */
export type CalendarEvent = {
    uid: string;
    title: string;
    description: string;
    location: string | null;
    startAt: string;
    endAt: string;
};

const GOOGLE_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';

export function bookingCalendarEvent(
    confirmation: BookingConfirmation,
    slug: string,
): CalendarEvent {
    const organization = confirmation.organization_name;
    const description = [
        confirmation.professional_name &&
            `Profesional: ${confirmation.professional_name}`,
        confirmation.service_name && `Prestación: ${confirmation.service_name}`,
        `Si necesitás cancelar o reprogramar el turno, comunicate con ${organization}.`,
    ]
        .filter(Boolean)
        .join('\n');

    return {
        // The confirmation carries no appointment id; the slot and the practice identify the booking for the patient.
        uid: `turno-${utcStamp(confirmation.start_at)}-${slug}@clini`,
        title: `Turno en ${organization}`,
        description,
        location: confirmation.organization_address,
        startAt: confirmation.start_at,
        endAt: confirmation.end_at,
    };
}

/** `20260803T130000Z`: the UTC form both Google Calendar and iCalendar take (ADR 0016). */
function utcStamp(isoInstant: string): string {
    return fromInstant(isoInstant).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}

export function googleCalendarUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${utcStamp(event.startAt)}/${utcStamp(event.endAt)}`,
        details: event.description,
    });

    if (event.location) {
        params.set('location', event.location);
    }

    return `${GOOGLE_TEMPLATE_URL}?${params.toString()}`;
}

/** RFC 5545 §3.3.11: backslash, semicolon and comma are escaped, newlines become `\n`. */
function icsText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/** RFC 5545 §3.1: lines over 75 octets continue on the next one, indented by a space, never splitting a character. */
function foldLine(line: string): string {
    const chunks: string[] = [];
    let chunk = '';
    let limit = 75;

    for (const character of line) {
        if (encoder.encode(chunk + character).length > limit) {
            chunks.push(chunk);
            chunk = '';
            limit = 74;
        }
        chunk += character;
    }
    chunks.push(chunk);

    return chunks.join('\r\n ');
}

/** METHOD:PUBLISH, not REQUEST: a static copy of the appointment, not an invite to accept. */
export function icsFile(event: CalendarEvent, stampedAt: DateTime): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Clini//Turnos//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${icsText(event.uid)}`,
        `DTSTAMP:${utcStamp(stampedAt.toISO())}`,
        `DTSTART:${utcStamp(event.startAt)}`,
        `DTEND:${utcStamp(event.endAt)}`,
        `SUMMARY:${icsText(event.title)}`,
        `DESCRIPTION:${icsText(event.description)}`,
        ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** A `data:` URL, so a plain `<a download>` saves the file with no Blob or object URL to clean up. */
export function icsDataUrl(ics: string): string {
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
