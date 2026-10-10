import { HOUR_HEIGHT_PX } from './AgendaDayColumn';

function formatMinutes(totalMinutes: number): string {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Half-hour labels centered on the grid lines (the first one sits at the top edge).
export function AgendaTimeGutter({ hours }: { hours: number[] }) {
    const slots = Array.from(
        { length: hours.length * 2 },
        (_, index) => hours[0] * 60 + index * 30,
    );

    return (
        <div
            className="relative"
            style={{ height: hours.length * HOUR_HEIGHT_PX }}
        >
            {slots.map((minutes, index) => (
                <span
                    key={minutes}
                    className={
                        index === 0
                            ? 'absolute right-2 text-[0.7rem] text-muted-foreground tabular-nums'
                            : 'absolute right-2 -translate-y-1/2 text-[0.7rem] text-muted-foreground tabular-nums'
                    }
                    style={{ top: index * (HOUR_HEIGHT_PX / 2) }}
                >
                    {formatMinutes(minutes)}
                </span>
            ))}
        </div>
    );
}
