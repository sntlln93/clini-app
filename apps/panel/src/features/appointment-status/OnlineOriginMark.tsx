import { ONLINE_LABEL, ONLINE_TONE } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

// Amber dot for an appointment booked online. It sits next to the status
// chip, never in its place: origin and status are independent.
export function OnlineOriginMark({ className }: { className?: string }) {
    return (
        <span
            role="img"
            aria-label={ONLINE_LABEL}
            title={ONLINE_LABEL}
            data-origin="online"
            className={cn(
                'inline-block size-2 shrink-0 rounded-full ring-2 ring-card',
                ONLINE_TONE.dot,
                className,
            )}
        />
    );
}
