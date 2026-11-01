import { DateTime } from '@/lib/datetime';
import { describe, expect, it } from 'vitest';
import {
    ageInDaysOn,
    ageInYears,
    formatAgeOn,
    formatBirthDateWithAge,
} from '../-components/patient-age';

describe('ageInYears', () => {
    const today = DateTime.local(2026, 8, 13);

    it('counts this year once the birthday has passed', () => {
        expect(ageInYears('1990-03-01', today)).toBe(36);
    });

    it('does not count this year before the birthday', () => {
        expect(ageInYears('1990-11-30', today)).toBe(35);
    });

    it('counts this year on the birthday itself', () => {
        expect(ageInYears('1990-08-13', today)).toBe(36);
    });

    it('does not count it the day before the birthday', () => {
        expect(ageInYears('1990-08-14', today)).toBe(35);
    });
});

describe('ageInYears on edge calendar dates', () => {
    it('counts the year on the birthday of a date whose midnight DST skipped', () => {
        // Buenos Aires moved its clocks at 00:00 on 2008-10-19, so that day starts at 01:00.
        expect(ageInYears('2008-10-19', DateTime.local(2026, 10, 19))).toBe(18);
    });

    it('counts a 29 February birthday only from 1 March in a common year', () => {
        expect(ageInYears('2000-02-29', DateTime.local(2026, 2, 28))).toBe(25);
        expect(ageInYears('2000-02-29', DateTime.local(2026, 3, 1))).toBe(26);
    });
});

describe('formatBirthDateWithAge', () => {
    const today = DateTime.local(2026, 8, 13);

    it('shows the date with the age', () => {
        expect(formatBirthDateWithAge('1990-03-01', today)).toBe(
            '01/03/1990 (36 años)',
        );
    });

    it('uses the singular for one year', () => {
        expect(formatBirthDateWithAge('2025-01-10', today)).toBe(
            '10/01/2025 (1 año)',
        );
    });

    it('shows a dash when the birth date is unknown', () => {
        expect(formatBirthDateWithAge(null, today)).toBe('—');
    });
});

describe('age at a measurement', () => {
    it('counts calendar days, leap years included', () => {
        expect(ageInDaysOn('2024-03-01', DateTime.local(2025, 3, 1, 18))).toBe(
            365,
        );
        expect(ageInDaysOn('2024-02-01', DateTime.local(2025, 2, 1))).toBe(366);
    });

    it('counts a whole day from a birth date whose midnight DST skipped', () => {
        // Buenos Aires moved its clocks at 00:00 on 2008-10-19.
        expect(ageInDaysOn('2008-10-19', DateTime.local(2008, 10, 20))).toBe(1);
        expect(formatAgeOn('2008-10-19', DateTime.local(2026, 10, 19))).toBe(
            '18 años',
        );
    });

    it('reads in days, then months, then years and months', () => {
        const birth = '2024-03-01';

        expect(formatAgeOn(birth, DateTime.local(2024, 3, 2))).toBe('1 día');
        expect(formatAgeOn(birth, DateTime.local(2024, 3, 16))).toBe('15 días');
        expect(formatAgeOn(birth, DateTime.local(2024, 4, 1))).toBe('1 mes');
        expect(formatAgeOn(birth, DateTime.local(2026, 2, 28))).toBe(
            '23 meses',
        );
        expect(formatAgeOn(birth, DateTime.local(2026, 3, 1))).toBe('2 años');
        expect(formatAgeOn(birth, DateTime.local(2027, 4, 15))).toBe(
            '3 años y 1 mes',
        );
    });
});
