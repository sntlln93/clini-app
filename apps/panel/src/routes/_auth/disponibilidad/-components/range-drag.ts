import {
    clamp,
    SNAP_MINUTES,
    snapMinutes,
    type Bounds,
    type Range,
} from './week-draft';

// The pointer geometry of the weekly grid: what a drag turns a range into.

/** Shifts by a snapped delta, keeping the duration and staying inside `bounds`. */
export function moveRange(range: Range, delta: number, bounds: Bounds): Range {
    const duration = range.end - range.start;
    const start = clamp(
        range.start + Math.round(delta / SNAP_MINUTES) * SNAP_MINUTES,
        bounds.start,
        Math.max(bounds.start, bounds.end - duration),
    );

    return { start, end: Math.min(start + duration, bounds.end) };
}

/** Moves one edge to the snapped `minute`, keeping at least one snap step. */
export function resizeRange(
    range: Range,
    edge: 'start' | 'end',
    minute: number,
    bounds: Bounds,
): Range {
    const snapped = snapMinutes(minute);

    if (edge === 'start') {
        return {
            start: clamp(snapped, bounds.start, range.end - SNAP_MINUTES),
            end: range.end,
        };
    }

    return {
        start: range.start,
        end: clamp(snapped, range.start + SNAP_MINUTES, bounds.end),
    };
}

/** The range drawn between where a drag started and where the pointer is. */
export function rangeBetween(
    anchor: number,
    current: number,
    bounds: Bounds,
): Range {
    const from = clamp(snapMinutes(anchor), bounds.start, bounds.end);
    const to = clamp(snapMinutes(current), bounds.start, bounds.end);
    const start = Math.min(from, to);
    const end = Math.max(from, to);

    if (end - start >= SNAP_MINUTES) {
        return { start, end };
    }

    return start + SNAP_MINUTES <= bounds.end
        ? { start, end: start + SNAP_MINUTES }
        : { start: bounds.end - SNAP_MINUTES, end: bounds.end };
}
