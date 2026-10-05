import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

// Same shape as the agenda's appointment status chips: soft fill, colored dot
// and label. Amber text is too light on its wash, so `warning` keeps the
// regular text color and puts the amber on the dot.
const TONES: Record<StatusTone, { pill: string; dot: string }> = {
    success: { pill: 'bg-success-wash text-success', dot: 'bg-success' },
    warning: { pill: 'bg-warning-wash text-foreground', dot: 'bg-warning' },
    danger: {
        pill: 'bg-destructive-wash text-destructive',
        dot: 'bg-destructive',
    },
    neutral: {
        pill: 'bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground',
    },
    info: { pill: 'bg-accent text-accent-foreground', dot: 'bg-primary' },
};

type StatusPillProps = {
    tone: StatusTone;
    children: ReactNode;
    className?: string;
};

/** A state label (membership, subscription, account…) colored by its tone. */
export function StatusPill({ tone, children, className }: StatusPillProps) {
    return (
        <span
            data-tone={tone}
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                TONES[tone].pill,
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    TONES[tone].dot,
                )}
            />
            {children}
        </span>
    );
}
