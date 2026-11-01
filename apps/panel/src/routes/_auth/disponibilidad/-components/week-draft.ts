import type { Availability } from '@/types/availability';

/** Minutes since midnight, in the practice's wall clock (a weekly slot is a clock time, not an instant). */
export type Range = { start: number; end: number };

/** Index = `day_of_week` (0 = Sunday), each day's ranges sorted and merged. */
export type WeekDraft = readonly (readonly Range[])[];

export type Bounds = { start: number; end: number };

export type SlotPayload = {
    day_of_week: number;
    start_time: string;
    end_time: string;
};

export const SNAP_MINUTES = 15;
/** `H:i` can't say 24:00, so a day ends a minute before midnight. */
export const LAST_MINUTE = 24 * 60 - 1;

const DEFAULT_BOUNDS: Bounds = { start: 8 * 60, end: 20 * 60 };
const NEW_RANGE_MINUTES = 60;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function toMinutes(clock: string): number {
    const [hours, minutes] = clock.split(':').map(Number);

    return hours * 60 + minutes;
}

export function toClock(minutes: number): string {
    const hours = Math.floor(minutes / 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatRange(range: Range): string {
    return `${toClock(range.start)} – ${toClock(range.end)}`;
}

export function snapMinutes(minutes: number): number {
    return clamp(
        Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES,
        0,
        LAST_MINUTE,
    );
}

/** Clamps, drops empty ranges, sorts and merges the ones that overlap or touch. */
export function normalizeRanges(ranges: readonly Range[]): Range[] {
    const sorted = ranges
        .map((range) => ({
            start: clamp(range.start, 0, LAST_MINUTE),
            end: clamp(range.end, 0, LAST_MINUTE),
        }))
        .filter((range) => range.end > range.start)
        .sort((a, b) => a.start - b.start || a.end - b.end);

    const merged: Range[] = [];
    for (const range of sorted) {
        const last = merged.at(-1);
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end);
        } else {
            merged.push({ ...range });
        }
    }

    return merged;
}

export function emptyWeek(): WeekDraft {
    return Array.from({ length: 7 }, () => []);
}

export function fromSlots(slots: readonly Availability[]): WeekDraft {
    return emptyWeek().map((_, day) =>
        normalizeRanges(
            slots
                .filter((slot) => slot.day_of_week === day)
                .map((slot) => ({
                    start: toMinutes(slot.start_time),
                    end: toMinutes(slot.end_time),
                })),
        ),
    );
}

function withDay(
    week: WeekDraft,
    day: number,
    ranges: readonly Range[],
): WeekDraft {
    return week.map((current, index) =>
        index === day ? normalizeRanges(ranges) : current,
    );
}

export function addRange(week: WeekDraft, day: number, range: Range) {
    return withDay(week, day, [...week[day], range]);
}

export function replaceRange(
    week: WeekDraft,
    day: number,
    index: number,
    range: Range,
): WeekDraft {
    return withDay(
        week,
        day,
        week[day].map((current, i) => (i === index ? range : current)),
    );
}

export function removeRange(week: WeekDraft, day: number, index: number) {
    return withDay(
        week,
        day,
        week[day].filter((_, i) => i !== index),
    );
}

/** Replaces each target day's ranges with a copy of `from`'s. */
export function copyDay(
    week: WeekDraft,
    from: number,
    to: readonly number[],
): WeekDraft {
    return week.map((current, day) =>
        day !== from && to.includes(day)
            ? week[from].map((range) => ({ ...range }))
            : current,
    );
}

function isFree(ranges: readonly Range[], candidate: Range): boolean {
    return ranges.every(
        (range) => candidate.end < range.start || candidate.start > range.end,
    );
}

/** A one-hour range that doesn't touch the day's others, so adding it never merges; `null` when the day has no room. */
export function nextFreeRange(ranges: readonly Range[]): Range | null {
    const last = ranges.at(-1);
    const preferred = last ? last.end + NEW_RANGE_MINUTES : 9 * 60;
    const candidates = [preferred];
    for (let start = 0; start <= LAST_MINUTE; start += SNAP_MINUTES) {
        candidates.push(start);
    }

    for (const start of candidates) {
        const candidate = { start, end: start + NEW_RANGE_MINUTES };
        if (candidate.end <= LAST_MINUTE && isFree(ranges, candidate)) {
            return candidate;
        }
    }

    return null;
}

/** 08:00–20:00, widened to the whole hours of the earliest start and latest end. */
export function gridBounds(week: WeekDraft): Bounds {
    const ranges = week.flat();
    if (ranges.length === 0) {
        return DEFAULT_BOUNDS;
    }

    const earliest = Math.min(...ranges.map((range) => range.start));
    const latest = Math.max(...ranges.map((range) => range.end));

    return {
        start: Math.min(DEFAULT_BOUNDS.start, Math.floor(earliest / 60) * 60),
        end: Math.min(
            Math.max(DEFAULT_BOUNDS.end, Math.ceil(latest / 60) * 60),
            LAST_MINUTE,
        ),
    };
}

/** The body of `PUT /memberships/{id}/availabilities`, in the order the API reports errors by. */
export function toSlotsPayload(week: WeekDraft): SlotPayload[] {
    return week.flatMap((ranges, day) =>
        ranges.map((range) => ({
            day_of_week: day,
            start_time: toClock(range.start),
            end_time: toClock(range.end),
        })),
    );
}

/** Compares two weeks by content. */
export function weekKey(week: WeekDraft): string {
    return week.map((ranges) => ranges.map(formatRange).join(',')).join('|');
}

export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours === 0) {
        return `${rest} min`;
    }

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
