import {
    STATUS_LABELS,
    STATUS_TONES,
    STRUCK_STATUSES,
} from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/appointment';

type AppointmentStatusChipProps = {
    status: AppointmentStatus;
    /** `card` sits on a tinted appointment block; `pill` on a neutral surface. */
    surface?: 'card' | 'pill';
    className?: string;
};

// Status label with its colored dot. The label is always shown: color never
// carries the status on its own.
export function AppointmentStatusChip({
    status,
    surface = 'pill',
    className,
}: AppointmentStatusChipProps) {
    const tone = STATUS_TONES[status];

    return (
        <span
            data-status={status}
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1 rounded-full font-medium whitespace-nowrap',
                surface === 'card'
                    ? cn('bg-card px-1.5 py-0.5 text-[0.65rem]', tone.text)
                    : cn('px-2 py-0.5 text-xs', tone.pill),
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cn('size-1.5 shrink-0 rounded-full', tone.dot)}
            />
            <span
                className={cn(
                    STRUCK_STATUSES.includes(status) && 'line-through',
                )}
            >
                {STATUS_LABELS[status]}
            </span>
        </span>
    );
}
