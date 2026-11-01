import { afterEach, describe, expect, it } from 'vitest';
import {
    formatDayMonth,
    formatDayMonthYear,
    formatWeekdayDay,
    formatWeekdayDayMonth,
    fromCalendarDate,
    fromDateAndTime,
    fromDateTimeInputValue,
    fromInstant,
    isStartOfDay,
    setPracticeTimeZone,
    toDateTimeInputValue,
    toInstant,
    toTimeInputValue,
} from './datetime';

// The browser runs in Buenos Aires (UTC-3, vitest.config.ts); Bogotá (UTC-5) stands in for a practice elsewhere.
afterEach(() => setPracticeTimeZone(null));

describe('datetime-local values (#265)', () => {
    it('sends a 09:00 block entered in Buenos Aires as 12:00 UTC', () => {
        setPracticeTimeZone('America/Argentina/Buenos_Aires');

        expect(fromDateTimeInputValue('2026-10-12T09:00')).toBe(
            '2026-10-12T12:00:00.000Z',
        );
    });

    it("prefills the form with the API's instant in the practice's wall clock", () => {
        setPracticeTimeZone('America/Argentina/Buenos_Aires');

        expect(toDateTimeInputValue('2026-10-12T12:00:00.000000Z')).toBe(
            '2026-10-12T09:00',
        );
    });

    it("reads both ways in the practice's zone, not the browser's", () => {
        setPracticeTimeZone('America/Bogota');

        expect(fromDateTimeInputValue('2026-10-12T09:00')).toBe(
            '2026-10-12T14:00:00.000Z',
        );
        expect(toDateTimeInputValue('2026-10-12T14:00:00Z')).toBe(
            '2026-10-12T09:00',
        );
    });
});

describe('date and time inputs', () => {
    it("turn the practice's wall clock into a UTC instant", () => {
        setPracticeTimeZone('America/Bogota');

        expect(toInstant(fromDateAndTime('2026-08-03', '10:00'))).toBe(
            '2026-08-03T15:00:00.000Z',
        );
    });

    it('round-trip to the same hour', () => {
        expect(
            toTimeInputValue(
                fromInstant(toInstant(fromDateAndTime('2026-08-03', '21:45'))),
            ),
        ).toBe('21:45');
    });
});

describe('setPracticeTimeZone', () => {
    it("shows an API instant in the practice's zone", () => {
        setPracticeTimeZone('America/Bogota');

        expect(fromInstant('2026-10-12T14:00:00Z').hour).toBe(9);
    });

    it("falls back to the browser's zone for an unknown one", () => {
        setPracticeTimeZone('Not/A_Zone');

        expect(fromInstant('2026-10-12T12:00:00Z').hour).toBe(9);
    });
});

describe('short date labels', () => {
    const day = fromCalendarDate('2027-01-04');

    it('read in es-AR without dots or commas', () => {
        expect(formatDayMonth(day)).toBe('4 ene');
        expect(formatDayMonthYear(day)).toBe('4 ene 2027');
        expect(formatWeekdayDay(day)).toBe('lun 4');
        expect(formatWeekdayDayMonth(day)).toBe('lun 4 de enero');
    });
});

describe('isStartOfDay', () => {
    it("holds only at midnight of the practice's zone", () => {
        setPracticeTimeZone('Etc/UTC');

        expect(isStartOfDay(fromInstant('2026-11-12T00:00:00Z'))).toBe(true);
        expect(isStartOfDay(fromInstant('2026-11-12T03:00:00Z'))).toBe(false);

        setPracticeTimeZone('America/Argentina/Buenos_Aires');

        expect(isStartOfDay(fromInstant('2026-11-12T03:00:00Z'))).toBe(true);
        expect(isStartOfDay(fromInstant('2026-11-12T00:00:00Z'))).toBe(false);
    });
});
