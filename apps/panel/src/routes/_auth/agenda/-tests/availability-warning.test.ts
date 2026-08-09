import type { Availability, AvailabilityException } from '@/types/availability';
import { describe, expect, it } from 'vitest';
import { isOutsideAvailability } from '../-hooks/use-availability-warning';

function availability(overrides: Partial<Availability> = {}): Availability {
    return {
        id: 1,
        membership_id: 1,
        day_of_week: 0,
        start_time: '09:00:00',
        end_time: '12:00:00',
        ...overrides,
    };
}

function exception(
    overrides: Partial<AvailabilityException> = {},
): AvailabilityException {
    return {
        id: 1,
        membership_id: 1,
        type: 'blocked',
        start_at: '2026-08-03T09:00:00',
        end_at: '2026-08-03T10:00:00',
        reason: null,
        ...overrides,
    };
}

describe('isOutsideAvailability', () => {
    it('returns false when the time falls inside a recurring slot for that weekday', () => {
        const dateTime = new Date('2026-08-03T10:00:00');
        const dayOfWeek = dateTime.getDay();

        const result = isOutsideAvailability(
            dateTime,
            [availability({ day_of_week: dayOfWeek })],
            [],
        );

        expect(result).toBe(false);
    });

    it('returns true when the time falls outside every recurring slot on that weekday', () => {
        const dateTime = new Date('2026-08-03T13:00:00');
        const dayOfWeek = dateTime.getDay();

        const result = isOutsideAvailability(
            dateTime,
            [availability({ day_of_week: dayOfWeek })],
            [],
        );

        expect(result).toBe(true);
    });

    it('returns true when the weekday has no recurring slot at all', () => {
        const dateTime = new Date('2026-08-03T10:00:00');
        const otherWeekday = (dateTime.getDay() + 1) % 7;

        const result = isOutsideAvailability(
            dateTime,
            [availability({ day_of_week: otherWeekday })],
            [],
        );

        expect(result).toBe(true);
    });

    it('returns true when the time is inside a recurring slot but covered by a blocked exception window', () => {
        const dateTime = new Date('2026-08-03T10:00:00');
        const dayOfWeek = dateTime.getDay();

        const result = isOutsideAvailability(
            dateTime,
            [availability({ day_of_week: dayOfWeek })],
            [
                exception({
                    type: 'blocked',
                    start_at: '2026-08-03T09:30:00',
                    end_at: '2026-08-03T11:00:00',
                }),
            ],
        );

        expect(result).toBe(true);
    });

    it('returns false when the time is outside every recurring slot but covered by an extra exception', () => {
        const dateTime = new Date('2026-08-03T13:00:00');
        const dayOfWeek = dateTime.getDay();

        const result = isOutsideAvailability(
            dateTime,
            [availability({ day_of_week: dayOfWeek })],
            [
                exception({
                    type: 'extra',
                    start_at: '2026-08-03T12:30:00',
                    end_at: '2026-08-03T14:00:00',
                }),
            ],
        );

        expect(result).toBe(false);
    });

    describe('boundary behavior', () => {
        it('treats a slot start_time as inside (inclusive lower bound)', () => {
            const dateTime = new Date('2026-08-03T09:00:00');
            const dayOfWeek = dateTime.getDay();

            const result = isOutsideAvailability(
                dateTime,
                [
                    availability({
                        day_of_week: dayOfWeek,
                        start_time: '09:00:00',
                        end_time: '12:00:00',
                    }),
                ],
                [],
            );

            expect(result).toBe(false);
        });

        it('treats a slot end_time as outside (exclusive upper bound)', () => {
            const dateTime = new Date('2026-08-03T12:00:00');
            const dayOfWeek = dateTime.getDay();

            const result = isOutsideAvailability(
                dateTime,
                [
                    availability({
                        day_of_week: dayOfWeek,
                        start_time: '09:00:00',
                        end_time: '12:00:00',
                    }),
                ],
                [],
            );

            expect(result).toBe(true);
        });

        it('treats an exception window start_at as covered (inclusive lower bound)', () => {
            const dateTime = new Date('2026-08-03T09:30:00');
            const dayOfWeek = dateTime.getDay();

            const result = isOutsideAvailability(
                dateTime,
                [availability({ day_of_week: dayOfWeek })],
                [
                    exception({
                        type: 'blocked',
                        start_at: '2026-08-03T09:30:00',
                        end_at: '2026-08-03T10:00:00',
                    }),
                ],
            );

            expect(result).toBe(true);
        });

        it('treats an exception window end_at as no longer covered (exclusive upper bound)', () => {
            const dateTime = new Date('2026-08-03T10:00:00');
            const dayOfWeek = dateTime.getDay();

            const result = isOutsideAvailability(
                dateTime,
                // Recurring slot still covers 09:00-12:00, isolating exactly what the exception boundary does.
                [availability({ day_of_week: dayOfWeek })],
                [
                    exception({
                        type: 'blocked',
                        start_at: '2026-08-03T09:30:00',
                        end_at: '2026-08-03T10:00:00',
                    }),
                ],
            );

            expect(result).toBe(false);
        });
    });
});
