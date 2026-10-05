import {
    LEGEND_STATUSES,
    ONLINE_LABEL,
    ONLINE_TONE,
    STATUS_LABELS,
    STATUS_TONES,
} from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

function LegendItem({ dot, label }: { dot: string; label: string }) {
    return (
        <li className="inline-flex items-center gap-1.5">
            <span
                aria-hidden="true"
                className={cn('size-2.5 shrink-0 rounded-full', dot)}
            />
            {label}
        </li>
    );
}

// The agenda's color key: one dot per status plus the online-booking mark.
export function AppointmentStatusLegend({ className }: { className?: string }) {
    return (
        <ul
            aria-label="Referencias de estados"
            className={cn(
                'flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs text-muted-foreground',
                className,
            )}
        >
            {LEGEND_STATUSES.map((status) => (
                <LegendItem
                    key={status}
                    dot={STATUS_TONES[status].dot}
                    label={STATUS_LABELS[status]}
                />
            ))}
            <LegendItem dot={ONLINE_TONE.dot} label={ONLINE_LABEL} />
        </ul>
    );
}
