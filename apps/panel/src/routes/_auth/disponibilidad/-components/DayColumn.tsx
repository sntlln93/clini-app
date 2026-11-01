import { cn } from '@/lib/utils';
import {
    columnHeight,
    hoursOf,
    rangeStyle,
    useColumnDrag,
} from '../-hooks/use-column-drag';
import { TimeBlock } from './TimeBlock';
import { formatRange, type Bounds, type Range } from './week-draft';
import { DAY_NAMES } from './week-labels';

type DayColumnProps = {
    day: number;
    ranges: readonly Range[];
    bounds: Bounds;
    selected: boolean;
    /** Pointer drawing, moving and resizing (desktop, while editable). */
    draggable: boolean;
    /** Makes the blocks buttons; without it they are only drawn. */
    onBlockClick?: (index: number) => void;
    onSelect?: () => void;
    onCreate?: (range: Range) => void;
    onChange?: (index: number, range: Range) => void;
};

function ignore() {}

export function DayColumn({
    day,
    ranges,
    bounds,
    selected,
    draggable,
    onBlockClick,
    onSelect = ignore,
    onCreate = ignore,
    onChange = ignore,
}: DayColumnProps) {
    const drag = useColumnDrag({
        ranges,
        bounds,
        onCreate,
        onChange,
        onTap: onSelect,
    });

    return (
        <div
            role="group"
            aria-label={DAY_NAMES[day]}
            data-day={day}
            onPointerDown={draggable ? drag.startCreate : undefined}
            {...(draggable ? drag.columnHandlers : {})}
            className={cn(
                'relative min-w-0 flex-1 select-none',
                draggable && 'cursor-crosshair touch-none',
                selected && 'bg-muted/60',
            )}
            style={{ height: columnHeight(bounds) }}
        >
            {hoursOf(bounds).map((hour) => (
                <div
                    key={hour}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-dashed border-border"
                    style={{
                        top: rangeStyle(
                            { start: hour * 60, end: hour * 60 },
                            bounds,
                        ).top,
                    }}
                />
            ))}

            {drag.displayed.length === 0 && (
                <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted-foreground">
                    Sin atención
                </p>
            )}

            {drag.displayed.map(({ range, index }) => (
                <TimeBlock
                    key={index ?? 'new'}
                    range={range}
                    bounds={bounds}
                    label={`${DAY_NAMES[day]}, ${formatRange(range)}`}
                    onClick={
                        onBlockClick && index !== null
                            ? () => onBlockClick(index)
                            : undefined
                    }
                    onDragStart={
                        draggable && index !== null
                            ? (event, kind) =>
                                  drag.startEdit(event, index, kind)
                            : undefined
                    }
                />
            ))}
        </div>
    );
}
