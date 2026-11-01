import type { Availability } from '@/types/availability';
import { describe, expect, it } from 'vitest';
import {
    moveRange,
    rangeBetween,
    resizeRange,
} from '../-components/range-drag';
import {
    addRange,
    copyDay,
    emptyWeek,
    formatDuration,
    formatRange,
    fromSlots,
    gridBounds,
    LAST_MINUTE,
    nextFreeRange,
    normalizeRanges,
    removeRange,
    replaceRange,
    snapMinutes,
    toClock,
    toMinutes,
    toSlotsPayload,
    weekKey,
    type Range,
    type WeekDraft,
} from '../-components/week-draft';

const h = (clock: string) => toMinutes(clock);
const r = (start: string, end: string): Range => ({
    start: h(start),
    end: h(end),
});

function slot(
    id: number,
    day: number,
    start: string,
    end: string,
): Availability {
    return {
        id,
        membership_id: 3,
        day_of_week: day,
        start_time: start,
        end_time: end,
    };
}

function weekWith(day: number, ranges: Range[]): WeekDraft {
    return emptyWeek().map((current, index) =>
        index === day ? ranges : current,
    );
}

describe('clock conversion', () => {
    it('converts both ways and formats a range in 24h', () => {
        expect(toMinutes('09:30')).toBe(570);
        expect(toMinutes('09:30:00')).toBe(570);
        expect(toClock(570)).toBe('09:30');
        expect(toClock(0)).toBe('00:00');
        expect(formatRange(r('09:00', '13:00'))).toBe('09:00 – 13:00');
    });

    it('snaps to 15 minutes inside the day', () => {
        expect(snapMinutes(h('09:07'))).toBe(h('09:00'));
        expect(snapMinutes(h('09:08'))).toBe(h('09:15'));
        expect(snapMinutes(-20)).toBe(0);
        expect(snapMinutes(24 * 60 + 30)).toBe(LAST_MINUTE);
    });

    it('formats a duration', () => {
        expect(formatDuration(180)).toBe('3 h');
        expect(formatDuration(90)).toBe('1 h 30 min');
        expect(formatDuration(45)).toBe('45 min');
    });
});

describe('normalizeRanges', () => {
    it('sorts the ranges by start', () => {
        expect(
            normalizeRanges([r('16:00', '19:00'), r('09:00', '13:00')]),
        ).toEqual([r('09:00', '13:00'), r('16:00', '19:00')]);
    });

    it('merges overlapping ranges', () => {
        expect(
            normalizeRanges([r('09:00', '13:00'), r('12:00', '15:00')]),
        ).toEqual([r('09:00', '15:00')]);
    });

    it('merges adjacent ranges, which the API rejects as separate', () => {
        expect(
            normalizeRanges([r('09:00', '13:00'), r('13:00', '15:00')]),
        ).toEqual([r('09:00', '15:00')]);
    });

    it('absorbs a range inside another and chains merges', () => {
        expect(
            normalizeRanges([
                r('09:00', '18:00'),
                r('10:00', '11:00'),
                r('18:00', '19:00'),
                r('19:00', '20:00'),
            ]),
        ).toEqual([r('09:00', '20:00')]);
    });

    it('drops empty or inverted ranges and clamps to the day', () => {
        expect(
            normalizeRanges([
                r('10:00', '10:00'),
                r('12:00', '11:00'),
                { start: -30, end: 60 },
                { start: h('23:00'), end: 24 * 60 + 60 },
            ]),
        ).toEqual([
            { start: 0, end: 60 },
            { start: h('23:00'), end: LAST_MINUTE },
        ]);
    });

    it('keeps ranges with a gap between them apart', () => {
        expect(
            normalizeRanges([r('09:00', '13:00'), r('13:15', '14:00')]),
        ).toHaveLength(2);
    });
});

describe('fromSlots', () => {
    it('groups the API slots by day_of_week (0 = Sunday), merged', () => {
        const week = fromSlots([
            slot(1, 0, '10:00', '12:00'),
            slot(2, 1, '16:00', '19:00'),
            slot(3, 1, '09:00', '13:00'),
            slot(4, 1, '13:00', '14:00'),
        ]);

        expect(week).toHaveLength(7);
        expect(week[0]).toEqual([r('10:00', '12:00')]);
        expect(week[1]).toEqual([r('09:00', '14:00'), r('16:00', '19:00')]);
        expect(week[2]).toEqual([]);
    });
});

describe('editing the draft', () => {
    const week = weekWith(1, [r('09:00', '13:00'), r('16:00', '19:00')]);

    it('adds a range, merging it with a neighbor it touches', () => {
        expect(addRange(week, 1, r('13:00', '14:00'))[1]).toEqual([
            r('09:00', '14:00'),
            r('16:00', '19:00'),
        ]);
        expect(addRange(week, 2, r('08:00', '09:00'))[2]).toEqual([
            r('08:00', '09:00'),
        ]);
    });

    it('replaces a range and merges if it now overlaps', () => {
        expect(replaceRange(week, 1, 1, r('12:00', '19:00'))[1]).toEqual([
            r('09:00', '19:00'),
        ]);
        expect(replaceRange(week, 1, 0, r('08:00', '12:00'))[1]).toEqual([
            r('08:00', '12:00'),
            r('16:00', '19:00'),
        ]);
    });

    it('removes a range', () => {
        expect(removeRange(week, 1, 0)[1]).toEqual([r('16:00', '19:00')]);
    });

    it('never mutates the previous week', () => {
        const before = weekKey(week);
        addRange(week, 1, r('10:00', '20:00'));
        replaceRange(week, 1, 0, r('07:00', '08:00'));
        removeRange(week, 1, 1);
        copyDay(week, 1, [2]);

        expect(weekKey(week)).toBe(before);
    });

    it('copies a day onto others, replacing their ranges', () => {
        const withTuesday = addRange(week, 2, r('07:00', '08:00'));
        const copied = copyDay(withTuesday, 1, [2, 5, 1]);

        expect(copied[2]).toEqual(week[1]);
        expect(copied[5]).toEqual(week[1]);
        expect(copied[1]).toEqual(week[1]);
        expect(copied[3]).toEqual([]);
    });

    it('copying an empty day clears the chosen days', () => {
        expect(copyDay(week, 0, [1])[1]).toEqual([]);
    });
});

describe('weekKey', () => {
    it('tells a changed week from the saved one, and back', () => {
        const saved = fromSlots([slot(1, 1, '09:00', '13:00')]);
        const changed = replaceRange(saved, 1, 0, r('09:00', '14:00'));
        const restored = replaceRange(changed, 1, 0, r('09:00', '13:00'));

        expect(weekKey(changed)).not.toBe(weekKey(saved));
        expect(weekKey(restored)).toBe(weekKey(saved));
    });

    it('treats the same hours on another day as a change', () => {
        expect(weekKey(weekWith(1, [r('09:00', '10:00')]))).not.toBe(
            weekKey(weekWith(2, [r('09:00', '10:00')])),
        );
    });
});

describe('toSlotsPayload', () => {
    it('lists the week by day_of_week, then start, as HH:MM', () => {
        const week = addRange(
            addRange(
                weekWith(1, [r('16:00', '19:00')]),
                1,
                r('09:00', '13:00'),
            ),
            0,
            r('10:00', '12:00'),
        );

        expect(toSlotsPayload(week)).toEqual([
            { day_of_week: 0, start_time: '10:00', end_time: '12:00' },
            { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
            { day_of_week: 1, start_time: '16:00', end_time: '19:00' },
        ]);
    });

    it('sends an empty list for an empty week', () => {
        expect(toSlotsPayload(emptyWeek())).toEqual([]);
    });
});

describe('nextFreeRange', () => {
    it('suggests 09:00–10:00 on an empty day', () => {
        expect(nextFreeRange([])).toEqual(r('09:00', '10:00'));
    });

    it('suggests an hour after the last range, leaving a gap', () => {
        expect(nextFreeRange([r('09:00', '13:00')])).toEqual(
            r('14:00', '15:00'),
        );
    });

    it('falls back to the first free hour that touches nothing', () => {
        expect(nextFreeRange([r('02:00', '23:59')])).toEqual(
            r('00:00', '01:00'),
        );
    });

    it('returns null when the day has no room', () => {
        expect(nextFreeRange([r('00:00', '23:59')])).toBeNull();
    });
});

describe('gridBounds', () => {
    it('shows 08:00–20:00 by default', () => {
        expect(gridBounds(emptyWeek())).toEqual(r('08:00', '20:00'));
        expect(gridBounds(weekWith(1, [r('09:00', '13:00')]))).toEqual(
            r('08:00', '20:00'),
        );
    });

    it('widens to the whole hours of the earliest and latest range', () => {
        const week = addRange(
            weekWith(1, [r('06:30', '09:00')]),
            3,
            r('18:00', '21:15'),
        );

        expect(gridBounds(week)).toEqual(r('06:00', '22:00'));
    });

    it('never goes past the last minute of the day', () => {
        expect(gridBounds(weekWith(1, [r('22:00', '23:59')])).end).toBe(
            LAST_MINUTE,
        );
    });
});

describe('drag geometry', () => {
    const bounds = r('08:00', '20:00');

    it('moves by snapped steps, keeping the duration', () => {
        expect(moveRange(r('09:00', '13:00'), 58, bounds)).toEqual(
            r('10:00', '14:00'),
        );
        expect(moveRange(r('09:00', '13:00'), -7, bounds)).toEqual(
            r('09:00', '13:00'),
        );
    });

    it('stops a move at the grid edges', () => {
        expect(moveRange(r('09:00', '13:00'), -600, bounds)).toEqual(
            r('08:00', '12:00'),
        );
        expect(moveRange(r('09:00', '13:00'), 600, bounds)).toEqual(
            r('16:00', '20:00'),
        );
    });

    it('resizes an edge to the snapped minute, never under 15 minutes', () => {
        const range = r('09:00', '13:00');

        expect(resizeRange(range, 'start', h('09:38'), bounds)).toEqual(
            r('09:45', '13:00'),
        );
        expect(resizeRange(range, 'end', h('17:10'), bounds)).toEqual(
            r('09:00', '17:15'),
        );
        expect(resizeRange(range, 'start', h('14:00'), bounds)).toEqual(
            r('12:45', '13:00'),
        );
        expect(resizeRange(range, 'end', h('08:00'), bounds)).toEqual(
            r('09:00', '09:15'),
        );
        expect(resizeRange(range, 'end', h('23:00'), bounds)).toEqual(
            r('09:00', '20:00'),
        );
    });

    it('draws a new range in either direction, at least 15 minutes long', () => {
        expect(rangeBetween(h('10:05'), h('12:20'), bounds)).toEqual(
            r('10:00', '12:15'),
        );
        expect(rangeBetween(h('12:20'), h('10:05'), bounds)).toEqual(
            r('10:00', '12:15'),
        );
        expect(rangeBetween(h('10:05'), h('10:06'), bounds)).toEqual(
            r('10:00', '10:15'),
        );
        expect(rangeBetween(h('19:59'), h('19:59'), bounds)).toEqual(
            r('19:45', '20:00'),
        );
        expect(rangeBetween(h('07:00'), h('09:00'), bounds)).toEqual(
            r('08:00', '09:00'),
        );
    });
});
