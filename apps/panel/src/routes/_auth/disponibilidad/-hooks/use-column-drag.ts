import type { PointerEvent } from 'react';
import { useState } from 'react';
import {
    moveRange,
    rangeBetween,
    resizeRange,
} from '../-components/range-drag';
import type { Bounds, Range } from '../-components/week-draft';

/** Pixels per hour on the weekly grid; the drag math converts with it. */
export const HOUR_HEIGHT = 56;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
/** Below this, a press is a tap, not a drag. */
const DRAG_THRESHOLD_PX = 4;

export type EditKind = 'move' | 'start' | 'end';

type Drag = {
    kind: 'create' | EditKind;
    index: number | null;
    originY: number;
    anchor: number;
    initial: Range;
    preview: Range;
    moved: boolean;
};

export type DisplayedRange = { range: Range; index: number | null };

type ColumnDragOptions = {
    ranges: readonly Range[];
    bounds: Bounds;
    onCreate: (range: Range) => void;
    onChange: (index: number, range: Range) => void;
    onTap: () => void;
};

function capture(event: PointerEvent<HTMLElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
}

function previewOf(drag: Drag, delta: number, bounds: Bounds): Range {
    switch (drag.kind) {
        case 'create':
            return rangeBetween(drag.anchor, drag.anchor + delta, bounds);
        case 'move':
            return moveRange(drag.initial, delta, bounds);
        case 'start':
            return resizeRange(
                drag.initial,
                'start',
                drag.initial.start + delta,
                bounds,
            );
        case 'end':
            return resizeRange(
                drag.initial,
                'end',
                drag.initial.end + delta,
                bounds,
            );
    }
}

/**
 * Pointer dragging on one day column of the weekly grid: drawing a new range
 * on empty space, moving a block, or resizing it by an edge. Every position
 * snaps to 15 minutes; the result reaches the draft only on release.
 */
export function useColumnDrag({
    ranges,
    bounds,
    onCreate,
    onChange,
    onTap,
}: ColumnDragOptions) {
    const [drag, setDrag] = useState<Drag | null>(null);

    function startCreate(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0) {
            return;
        }
        const top = event.currentTarget.getBoundingClientRect().top;
        const anchor = bounds.start + (event.clientY - top) / PX_PER_MINUTE;
        const preview = rangeBetween(anchor, anchor, bounds);
        capture(event);
        setDrag({
            kind: 'create',
            index: null,
            originY: event.clientY,
            anchor,
            initial: preview,
            preview,
            moved: false,
        });
    }

    function startEdit(
        event: PointerEvent<HTMLElement>,
        index: number,
        kind: EditKind,
    ) {
        event.stopPropagation();
        if (event.button !== 0) {
            return;
        }
        capture(event);
        setDrag({
            kind,
            index,
            originY: event.clientY,
            anchor: 0,
            initial: ranges[index],
            preview: ranges[index],
            moved: false,
        });
    }

    function onPointerMove(event: PointerEvent<HTMLElement>) {
        if (!drag) {
            return;
        }
        const distance = event.clientY - drag.originY;
        setDrag({
            ...drag,
            preview: previewOf(drag, distance / PX_PER_MINUTE, bounds),
            moved: drag.moved || Math.abs(distance) >= DRAG_THRESHOLD_PX,
        });
    }

    function onPointerUp() {
        if (!drag) {
            return;
        }
        setDrag(null);
        if (!drag.moved) {
            onTap();
        } else if (drag.index === null) {
            onCreate(drag.preview);
        } else {
            onChange(drag.index, drag.preview);
        }
    }

    const displayed: DisplayedRange[] = ranges.map((range, index) => ({
        range: drag?.moved && drag.index === index ? drag.preview : range,
        index,
    }));
    if (drag?.moved && drag.index === null) {
        displayed.push({ range: drag.preview, index: null });
    }

    return {
        displayed,
        isDragging: drag?.moved ?? false,
        startCreate,
        startEdit,
        columnHandlers: {
            onPointerMove,
            onPointerUp,
            onPointerCancel: () => setDrag(null),
        },
    };
}

/** Where a range sits inside a column that starts at `bounds.start`. */
export function rangeStyle(range: Range, bounds: Bounds) {
    return {
        top: (range.start - bounds.start) * PX_PER_MINUTE,
        height: (range.end - range.start) * PX_PER_MINUTE,
    };
}

export function columnHeight(bounds: Bounds): number {
    return (bounds.end - bounds.start) * PX_PER_MINUTE;
}

/** The whole hours a column shows, for its lines and the rail's labels. */
export function hoursOf(bounds: Bounds): number[] {
    const hours: number[] = [];
    for (
        let hour = Math.ceil(bounds.start / 60);
        hour * 60 <= bounds.end;
        hour++
    ) {
        hours.push(hour);
    }
    return hours;
}
