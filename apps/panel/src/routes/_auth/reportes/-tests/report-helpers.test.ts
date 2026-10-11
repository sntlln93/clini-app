import { describe, expect, it } from 'vitest';
import {
    formatBucket,
    formatBucketRange,
    formatHours,
    formatMonth,
    formatPercent,
} from '../-components/report-format';
import {
    defaultFrom,
    effectiveRangeError,
    rangeError,
} from '../-components/report-range';
import { reportTotals } from '../-components/report-totals';
import { buildBucket } from './fixtures';

describe('report-format', () => {
    it('formats rates, hours and periods in es-AR', () => {
        expect(formatPercent(0.4286)).toMatch(/^42,9\s?%$/);
        expect(formatPercent(null)).toBe('—');
        expect(formatHours(90)).toBe('1,5 h');
        expect(formatHours(420)).toBe('7 h');
        expect(formatMonth('2026-09')).toMatch(/^sept? 2026$/);
        expect(formatBucket('2026-09-07', 'week')).toMatch(/^7 sept?$/);
        expect(formatBucket('2026-09-01', 'month')).toBe(
            formatMonth('2026-09'),
        );
        expect(formatBucketRange('2026-09-07', '2026-09-13')).toBe(
            '07/09/2026 al 13/09/2026',
        );
        expect(formatBucketRange('2026-09-07', '2026-09-07')).toBe(
            '07/09/2026',
        );
    });
});

describe('report-range', () => {
    it('defaults "Desde" to the first day of the month two months before "Hasta"', () => {
        expect(defaultFrom('2026-10-15')).toBe('2026-08-01');
        expect(defaultFrom('2026-01-31')).toBe('2025-11-01');
    });

    it('mirrors the API range rules', () => {
        expect(rangeError('2026-09-10', '2026-09-01')).not.toBeNull();
        expect(rangeError('2025-01-01', '2026-01-02')).toBe(
            'El rango no puede superar los 366 días.',
        );
        expect(rangeError('2025-01-01', '2026-01-01')).toBeNull();
    });

    it('validates an empty bound as the API default', () => {
        expect(effectiveRangeError({}, '2026-10-15')).toBeNull();
        expect(
            effectiveRangeError({ from: '2026-11-01' }, '2026-10-15'),
        ).toContain('no puede ser posterior a hoy');
        expect(
            effectiveRangeError({ from: '2025-01-01' }, '2026-10-15'),
        ).toContain('no puede superar los 366 días');
    });
});

describe('reportTotals', () => {
    it('sums the buckets and derives the rates', () => {
        const totals = reportTotals([
            buildBucket(),
            buildBucket({
                published_minutes: 420,
                booked_minutes: 120,
                attended: 1,
                no_show: 1,
                online: 1,
                manual: 3,
            }),
        ]);

        expect(totals).toEqual({
            publishedMinutes: 660,
            bookedMinutes: 240,
            occupancyRate: 240 / 660,
            attended: 4,
            noShow: 2,
            noShowRate: 2 / 6,
            online: 2,
            manual: 6,
            onlineRate: 0.25,
        });
    });

    it('leaves every rate null without denominators', () => {
        const totals = reportTotals([
            buildBucket({
                published_minutes: 0,
                booked_minutes: 0,
                attended: 0,
                no_show: 0,
                online: 0,
                manual: 0,
            }),
        ]);

        expect(totals.occupancyRate).toBeNull();
        expect(totals.noShowRate).toBeNull();
        expect(totals.onlineRate).toBeNull();
    });
});
