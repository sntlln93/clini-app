import { describe, expect, it } from 'vitest';
import { ageInYears, formatBirthDateWithAge } from '../-components/patient-age';

describe('ageInYears', () => {
    const today = new Date(2026, 7, 13);

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

describe('formatBirthDateWithAge', () => {
    const today = new Date(2026, 7, 13);

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
