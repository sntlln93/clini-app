import { DateTime, setPracticeTimeZone } from '@/lib/datetime';
import type { AvailabilityException } from '@/types/availability';
import { describe, expect, it } from 'vitest';
import {
    formatExceptionDates,
    formatExceptionDetail,
    formatExceptionRange,
    splitExceptions,
} from '../-components/exception-format';

// Vitest pins TZ to America/Argentina/Buenos_Aires (UTC-3), see vitest.config.ts:
// local midnight is 03:00Z.
describe('formatExceptionDates', () => {
    it('shows one day for a single all-day exception', () => {
        expect(
            formatExceptionDates(
                '2026-11-12T03:00:00Z',
                '2026-11-13T03:00:00Z',
            ),
        ).toBe('12 nov 2026');
    });

    it('shares the month and year of a range within one month', () => {
        expect(
            formatExceptionDates(
                '2027-01-04T03:00:00Z',
                '2027-01-16T03:00:00Z',
            ),
        ).toBe('4 – 15 ene 2027');
    });

    it('shares only the year across months', () => {
        expect(
            formatExceptionDates(
                '2026-11-28T03:00:00Z',
                '2026-12-04T03:00:00Z',
            ),
        ).toBe('28 nov – 3 dic 2026');
    });

    it('spells both years out across years', () => {
        expect(
            formatExceptionDates(
                '2026-12-28T03:00:00Z',
                '2027-01-04T03:00:00Z',
            ),
        ).toBe('28 dic 2026 – 3 ene 2027');
    });

    it('counts a timed range by the days it touches', () => {
        expect(
            formatExceptionDates(
                '2026-11-12T12:00:00Z',
                '2026-11-12T15:00:00Z',
            ),
        ).toBe('12 nov 2026');
    });
});

describe('formatExceptionDetail', () => {
    it('reads «Todo el día» for one whole day', () => {
        expect(
            formatExceptionDetail(
                '2026-11-12T03:00:00Z',
                '2026-11-13T03:00:00Z',
            ),
        ).toBe('Todo el día');
    });

    it('counts the days of a whole-day range', () => {
        expect(
            formatExceptionDetail(
                '2027-01-04T03:00:00Z',
                '2027-01-16T03:00:00Z',
            ),
        ).toBe('12 días');
    });

    it('shows the hours of a same-day range', () => {
        expect(
            formatExceptionDetail(
                '2026-11-12T12:00:00Z',
                '2026-11-12T15:00:00Z',
            ),
        ).toBe('09:00 – 12:00');
    });

    it('names both days of a timed range across days', () => {
        expect(
            formatExceptionDetail(
                '2027-01-04T17:00:00Z',
                '2027-01-06T15:00:00Z',
            ),
        ).toBe('lun 4, 14:00 – mié 6, 12:00');
    });

    it("reads whole days at the practice's midnight, not the browser's", () => {
        setPracticeTimeZone('Etc/UTC');

        expect(
            formatExceptionDetail(
                '2026-11-12T00:00:00Z',
                '2026-11-13T00:00:00Z',
            ),
        ).toBe('Todo el día');
        expect(
            formatExceptionDetail(
                '2026-11-12T03:00:00Z',
                '2026-11-13T03:00:00Z',
            ),
        ).toBe('jue 12, 03:00 – vie 13, 03:00');
    });
});

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
});

function exception(
    id: number,
    start: string,
    end: string,
): AvailabilityException {
    return {
        id,
        membership_id: 3,
        type: 'blocked',
        start_at: start,
        end_at: end,
        reason: null,
    };
}

describe('splitExceptions', () => {
    const now = DateTime.fromISO('2026-11-01T15:00:00Z');

    it('keeps running and future ones as upcoming, soonest first, and the rest as past, latest first', () => {
        const running = exception(
            1,
            '2026-11-01T03:00:00Z',
            '2026-11-02T03:00:00Z',
        );
        const later = exception(
            2,
            '2026-12-01T03:00:00Z',
            '2026-12-02T03:00:00Z',
        );
        const sooner = exception(
            3,
            '2026-11-10T03:00:00Z',
            '2026-11-11T03:00:00Z',
        );
        const old = exception(
            4,
            '2026-01-05T03:00:00Z',
            '2026-01-06T03:00:00Z',
        );
        const recent = exception(
            5,
            '2026-10-05T03:00:00Z',
            '2026-10-06T03:00:00Z',
        );

        const { upcoming, past } = splitExceptions(
            [later, old, running, recent, sooner],
            now,
        );

        expect(upcoming.map((item) => item.id)).toEqual([1, 3, 2]);
        expect(past.map((item) => item.id)).toEqual([5, 4]);
    });

    it('counts one ending exactly now as upcoming', () => {
        const { upcoming } = splitExceptions(
            [exception(1, '2026-11-01T12:00:00Z', '2026-11-01T15:00:00Z')],
            now,
        );

        expect(upcoming).toHaveLength(1);
    });
});
