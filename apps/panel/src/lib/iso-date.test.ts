import { describe, expect, it } from 'vitest';
import {
    addDaysToIsoDate,
    formatLongIsoDate,
    todayInTimeZone,
} from './iso-date';

describe('todayInTimeZone', () => {
    it("uses the given zone's calendar day, not UTC's", () => {
        // 02:00 UTC is still the previous evening in Buenos Aires (UTC-3).
        const now = new Date('2026-10-05T02:00:00Z');

        expect(todayInTimeZone('America/Argentina/Buenos_Aires', now)).toBe(
            '2026-10-04',
        );
        expect(todayInTimeZone('UTC', now)).toBe('2026-10-05');
    });
});

describe('addDaysToIsoDate', () => {
    it('moves forward and backward across month and year boundaries', () => {
        expect(addDaysToIsoDate('2026-10-31', 1)).toBe('2026-11-01');
        expect(addDaysToIsoDate('2026-01-01', -1)).toBe('2025-12-31');
        expect(addDaysToIsoDate('2026-10-05', 60)).toBe('2026-12-04');
    });
});

describe('formatLongIsoDate', () => {
    it('formats the date in long Spanish form without drifting a day', () => {
        expect(formatLongIsoDate('2026-10-05')).toBe('lunes, 5 de octubre');
    });
});
