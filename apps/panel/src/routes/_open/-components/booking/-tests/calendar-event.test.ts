import { describe, expect, it } from 'vitest';

import { DateTime } from '@/lib/datetime';
import type { BookingConfirmation } from '@/types/booking';

import {
    bookingCalendarEvent,
    googleCalendarUrl,
    icsDataUrl,
    icsFile,
} from '../calendar-event';

const CONFIRMATION: BookingConfirmation = {
    // -03:00 on purpose: both formats go out in UTC whatever the offset the API used.
    start_at: '2026-08-03T10:00:00-03:00',
    end_at: '2026-08-03T10:45:00-03:00',
    professional_name: 'Ana Gómez',
    service_name: 'Consulta',
    organization_name: 'Consultorio Salud',
    organization_address: 'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
    calendar_uid: '0123456789abcdef0123456789abcdef@clini.test',
};
const STAMPED_AT = DateTime.fromISO('2026-07-20T12:00:00Z');

describe('bookingCalendarEvent', () => {
    // #320: they can reveal the specialty, and the event ends up with a calendar provider.
    it('titles the event by the practice and names neither the professional nor the service', () => {
        const event = bookingCalendarEvent(CONFIRMATION);

        expect(event).toEqual({
            uid: '0123456789abcdef0123456789abcdef@clini.test',
            title: 'Turno en Consultorio Salud',
            description:
                'Si necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.',
            location: 'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
            startAt: CONFIRMATION.start_at,
            endAt: CONFIRMATION.end_at,
        });
        expect(JSON.stringify(event)).not.toMatch(/Ana Gómez|Consulta\b/);
    });
});

describe('googleCalendarUrl', () => {
    it('prefills title, UTC dates, details and location', () => {
        const url = new URL(
            googleCalendarUrl(bookingCalendarEvent(CONFIRMATION)),
        );

        expect(url.origin + url.pathname).toBe(
            'https://calendar.google.com/calendar/render',
        );
        expect(Object.fromEntries(url.searchParams)).toEqual({
            action: 'TEMPLATE',
            text: 'Turno en Consultorio Salud',
            dates: '20260803T130000Z/20260803T134500Z',
            details:
                'Si necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.',
            location: 'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
        });
    });

    it('leaves the location out when the practice has no address', () => {
        const url = new URL(
            googleCalendarUrl(
                bookingCalendarEvent({
                    ...CONFIRMATION,
                    organization_address: null,
                }),
            ),
        );

        expect(url.searchParams.has('location')).toBe(false);
    });
});

describe('icsFile', () => {
    it('is a published VEVENT in UTC, CRLF-terminated, with escaped text', () => {
        const ics = icsFile(bookingCalendarEvent(CONFIRMATION), STAMPED_AT);

        expect(ics).toBe(
            [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Clini//Turnos//ES',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                'UID:0123456789abcdef0123456789abcdef@clini.test',
                'DTSTAMP:20260720T120000Z',
                'DTSTART:20260803T130000Z',
                'DTEND:20260803T134500Z',
                'SUMMARY:Turno en Consultorio Salud',
                'DESCRIPTION:Si necesitás cancelar o reprogramar el turno\\, comunicate con ',
                ' Consultorio Salud.',
                'LOCATION:Av. Pellegrini 1500\\, Rosario\\, Santa Fe\\, Argentina',
                'END:VEVENT',
                'END:VCALENDAR',
            ].join('\r\n') + '\r\n',
        );
    });

    it('has no LOCATION without an address and escapes semicolons and backslashes', () => {
        const ics = icsFile(
            bookingCalendarEvent({
                ...CONFIRMATION,
                organization_name: 'Salud; Centro \\ Norte',
                organization_address: null,
            }),
            STAMPED_AT,
        );

        expect(ics).toContain(
            'SUMMARY:Turno en Salud\\; Centro \\\\ Norte\r\n',
        );
        expect(ics).not.toContain('LOCATION');
    });

    it('folds lines over 75 octets without splitting a multibyte character', () => {
        const ics = icsFile(
            bookingCalendarEvent({
                ...CONFIRMATION,
                organization_name: 'ñ'.repeat(100),
            }),
            STAMPED_AT,
        );
        const encoder = new TextEncoder();

        for (const line of ics.trimEnd().split('\r\n')) {
            expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
            expect(line).not.toContain('�');
        }
        expect(ics.replace(/\r\n /g, '')).toContain(
            `SUMMARY:Turno en ${'ñ'.repeat(100)}\r\n`,
        );
    });
});

describe('icsFile control characters', () => {
    it('turns any line break into an escaped newline and drops other control characters', () => {
        const ics = icsFile(
            bookingCalendarEvent({
                ...CONFIRMATION,
                organization_name:
                    'Ana\rLOCATION:otra\u0007 Gómez\r\ndos\ttres',
            }),
            STAMPED_AT,
        );

        expect(ics).toContain(
            'SUMMARY:Turno en Ana\\nLOCATION:otra Gómez\\ndos\ttres\r\n',
        );
        expect(ics.split('\r\nLOCATION:')).toHaveLength(2);
    });
});

describe('icsDataUrl', () => {
    it('round-trips the file through a text/calendar data URL', () => {
        const ics = icsFile(bookingCalendarEvent(CONFIRMATION), STAMPED_AT);
        const url = icsDataUrl(ics);

        expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
        expect(
            decodeURIComponent(
                url.slice('data:text/calendar;charset=utf-8,'.length),
            ),
        ).toBe(ics);
    });
});
