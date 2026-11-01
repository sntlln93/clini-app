import { columnHeight, hoursOf, rangeStyle } from '../-hooks/use-column-drag';
import { toClock, type Bounds } from './week-draft';

/** The hour labels beside the day columns, aligned with their lines. */
export function HourRail({ bounds }: { bounds: Bounds }) {
    return (
        <div
            aria-hidden
            className="relative w-12 shrink-0 text-xs text-muted-foreground tabular-nums"
            style={{ height: columnHeight(bounds) }}
        >
            {hoursOf(bounds).map((hour) => (
                <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2"
                    style={{
                        top: rangeStyle(
                            { start: hour * 60, end: hour * 60 },
                            bounds,
                        ).top,
                    }}
                >
                    {toClock(hour * 60)}
                </span>
            ))}
        </div>
    );
}
