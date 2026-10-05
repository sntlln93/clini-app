import { describe, expect, it } from 'vitest';
import {
    formatCurrencyARS,
    formatDate,
    formatDateTime,
    formatLocalDate,
    formatNumber,
    formatPercent,
    reportingDateOffset,
} from './format';

// Intl separates currency/percent symbols with a non-breaking space.
const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('format', () => {
    it('formats ARS as whole pesos, without decimals', () => {
        expect(normalize(formatCurrencyARS(15000))).toBe('$ 15.000');
        expect(normalize(formatCurrencyARS(1234.6))).toBe('$ 1.235');
    });

    it('formats a rate as a percentage, and null as "—"', () => {
        expect(normalize(formatPercent(0.1034))).toBe('10,3%');
        expect(normalize(formatPercent(0))).toBe('0%');
        expect(formatPercent(null)).toBe('—');
    });

    it('formats numbers with the es-AR thousands separator', () => {
        expect(formatNumber(1234567)).toBe('1.234.567');
    });

    it('renders timestamps in the reporting timezone, not UTC', () => {
        // 02:30 UTC on Oct 5 is still Oct 4 (23:30) in Buenos Aires.
        expect(formatDate('2026-10-05T02:30:00+00:00')).toBe('04/10/2026');
        expect(formatDateTime('2026-10-05T02:30:00+00:00')).toMatch(
            /^04\/10\/2026,? 23:30$/,
        );
        expect(formatDate(null)).toBe('—');
        expect(formatDateTime(null)).toBe('—');
    });

    it('formats a local Y-m-d date without shifting it', () => {
        expect(formatLocalDate('2026-10-04')).toBe('04/10/2026');
    });

    it('computes reporting-timezone dates relative to "today"', () => {
        // 23:30 in Buenos Aires: UTC already says Oct 5, the reporting day is still Oct 4.
        const now = new Date('2026-10-05T02:30:00Z');

        expect(reportingDateOffset(0, now)).toBe('2026-10-04');
        expect(reportingDateOffset(1, now)).toBe('2026-10-05');
        expect(reportingDateOffset(90, now)).toBe('2027-01-02');
    });
});
