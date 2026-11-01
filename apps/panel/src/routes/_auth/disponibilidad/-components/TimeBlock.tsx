import { cn } from '@/lib/utils';
import type { PointerEvent } from 'react';
import { rangeStyle, type EditKind } from '../-hooks/use-column-drag';
import { formatRange, type Bounds, type Range } from './week-draft';

type TimeBlockProps = {
    range: Range;
    bounds: Bounds;
    label: string;
    onClick?: () => void;
    onDragStart?: (event: PointerEvent<HTMLElement>, kind: EditKind) => void;
};

// A soft wash with the primary edge, like a calendar event: seven solid
// primary columns read as a wall of color, and the text stays the foreground.
const BLOCK_CLASSES =
    'absolute inset-x-1 flex items-center justify-center overflow-hidden rounded-lg border border-primary/40 border-l-4 border-l-primary bg-primary/12 px-1 text-xs font-medium text-foreground tabular-nums';

function ResizeHandle({
    edge,
    onDragStart,
}: {
    edge: 'start' | 'end';
    onDragStart: (event: PointerEvent<HTMLElement>, kind: EditKind) => void;
}) {
    return (
        <span
            aria-hidden
            data-edge={edge}
            onPointerDown={(event) => onDragStart(event, edge)}
            className={cn(
                'absolute inset-x-0 h-2 cursor-ns-resize after:absolute after:inset-x-1/3 after:h-0.5 after:rounded-full after:bg-primary/50',
                edge === 'start'
                    ? 'top-0 after:top-1'
                    : 'bottom-0 after:bottom-1',
            )}
        />
    );
}

/**
 * A weekly range on a day column. With `onClick` it is a button (keyboard and
 * screen readers reach the day through it); with `onDragStart` it can also be
 * moved and resized by pointer. Its box is the drawing, so it is exempt from
 * the 44px touch floor (the day panel is the alternative to dragging).
 */
export function TimeBlock({
    range,
    bounds,
    label,
    onClick,
    onDragStart,
}: TimeBlockProps) {
    const style = rangeStyle(range, bounds);
    const text = <span className="leading-tight">{formatRange(range)}</span>;
    const classes = BLOCK_CLASSES;

    if (!onClick) {
        return (
            <div className={classes} style={style}>
                {text}
            </div>
        );
    }

    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            onPointerDown={
                onDragStart && ((event) => onDragStart(event, 'move'))
            }
            className={cn(
                classes,
                'touch-target-exempt focus-ring hover:bg-primary/20',
                onDragStart && 'cursor-grab touch-none active:cursor-grabbing',
            )}
            style={style}
        >
            {onDragStart && (
                <ResizeHandle edge="start" onDragStart={onDragStart} />
            )}
            {text}
            {onDragStart && (
                <ResizeHandle edge="end" onDragStart={onDragStart} />
            )}
        </button>
    );
}
