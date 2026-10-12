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
};
const STAMPED_AT = DateTime.fromISO('2026-07-20T12:00:00Z');

describe('bookingCalendarEvent', () => {
    it('titles the event by the practice and describes professional and service', () => {
        const event = bookingCalendarEvent(CONFIRMATION, 'salud');

        expect(event).toEqual({
            uid: 'turno-20260803T130000Z-salud@clini',
            title: 'Turno en Consultorio Salud',
            description:
                'Profesional: Ana Gómez\nPrestación: Consulta\nSi necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.',
            location: 'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
            startAt: CONFIRMATION.start_at,
            endAt: CONFIRMATION.end_at,
        });
    });

    it('leaves out the lines whose name the API no longer resolves', () => {
        const event = bookingCalendarEvent(
            { ...CONFIRMATION, professional_name: null, service_name: null },
            'salud',
        );

        expect(event.description).toBe(
            'Si necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.',
        );
    });
});

describe('googleCalendarUrl', () => {
    it('prefills title, UTC dates, details and location', () => {
        const url = new URL(
            googleCalendarUrl(bookingCalendarEvent(CONFIRMATION, 'salud')),
        );

        expect(url.origin + url.pathname).toBe(
            'https://calendar.google.com/calendar/render',
        );
        expect(Object.fromEntries(url.searchParams)).toEqual({
            action: 'TEMPLATE',
            text: 'Turno en Consultorio Salud',
            dates: '20260803T130000Z/20260803T134500Z',
            details:
                'Profesional: Ana Gómez\nPrestación: Consulta\nSi necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.',
            location: 'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
        });
    });

    it('leaves the location out when the practice has no address', () => {
        const url = new URL(
            googleCalendarUrl(
                bookingCalendarEvent(
                    { ...CONFIRMATION, organization_address: null },
                    'salud',
                ),
            ),
        );

        expect(url.searchParams.has('location')).toBe(false);
    });
});

describe('icsFile', () => {
    it('is a published VEVENT in UTC, CRLF-terminated, with escaped text', () => {
        const ics = icsFile(
            bookingCalendarEvent(
                { ...CONFIRMATION, professional_name: null },
                'salud',
            ),
            STAMPED_AT,
        );

        expect(ics).toBe(
            [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Clini//Turnos//ES',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                'UID:turno-20260803T130000Z-salud@clini',
                'DTSTAMP:20260720T120000Z',
                'DTSTART:20260803T130000Z',
                'DTEND:20260803T134500Z',
                'SUMMARY:Turno en Consultorio Salud',
                'DESCRIPTION:Prestación: Consulta\\nSi necesitás cancelar o reprogramar el ',
                ' turno\\, comunicate con Consultorio Salud.',
                'LOCATION:Av. Pellegrini 1500\\, Rosario\\, Santa Fe\\, Argentina',
                'END:VEVENT',
                'END:VCALENDAR',
            ].join('\r\n') + '\r\n',
        );
    });

    it('has no LOCATION without an address and escapes semicolons and backslashes', () => {
        const ics = icsFile(
            bookingCalendarEvent(
                {
                    ...CONFIRMATION,
                    organization_name: 'Salud; Centro \\ Norte',
                    organization_address: null,
                },
                'salud',
            ),
            STAMPED_AT,
        );

        expect(ics).toContain(
            'SUMMARY:Turno en Salud\\; Centro \\\\ Norte\r\n',
        );
        expect(ics).not.toContain('LOCATION');
    });

    it('folds lines over 75 octets without splitting a multibyte character', () => {
        const ics = icsFile(
            bookingCalendarEvent(
                { ...CONFIRMATION, organization_name: 'ñ'.repeat(100) },
                'salud',
            ),
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

describe('icsDataUrl', () => {
    it('round-trips the file through a text/calendar data URL', () => {
        const ics = icsFile(
            bookingCalendarEvent(CONFIRMATION, 'salud'),
            STAMPED_AT,
        );
        const url = icsDataUrl(ics);

        expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
        expect(
            decodeURIComponent(
                url.slice('data:text/calendar;charset=utf-8,'.length),
            ),
        ).toBe(ics);
    });
});
