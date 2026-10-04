import { describe, expect, it } from 'vitest';
import {
    formatExceptionRange,
    isExceptionFinished,
} from '../-components/exception-format';

// Vitest pins TZ to America/Argentina/Buenos_Aires (UTC-3), see vitest.config.ts.
describe('formatExceptionRange', () => {
    it('compacts a same-day range into a single date', () => {
        expect(
            formatExceptionRange(
                '2026-10-12T12:00:00.000000Z',
                '2026-10-12T16:00:00.000000Z',
            ),
        ).toBe('lun 12 oct, 09:00 – 13:00');
    });

    it('spells out both dates when the range spans several days', () => {
        expect(
            formatExceptionRange(
                '2026-10-12T12:00:00Z',
                '2026-10-14T21:00:00Z',
            ),
        ).toBe('lun 12 oct, 09:00 – mié 14 oct, 18:00');
    });

    it('compares days in local time, not UTC', () => {
        // 22:00–23:30 local on the 12th is already the 13th in UTC.
        expect(
            formatExceptionRange(
                '2026-10-13T01:00:00Z',
                '2026-10-13T02:30:00Z',
            ),
        ).toBe('lun 12 oct, 22:00 – 23:30');
    });
});

describe('isExceptionFinished', () => {
    const now = new Date('2026-10-12T15:00:00Z');

    it('is finished once end_at is in the past', () => {
        expect(isExceptionFinished('2026-10-12T14:59:00Z', now)).toBe(true);
    });

    it('is not finished while it is still running or upcoming', () => {
        expect(isExceptionFinished('2026-10-12T16:00:00Z', now)).toBe(false);
    });
});
