import { buttonVariants } from '@/components/ui/button';
import {
    SUBSCRIPTION_SECTION_ID,
    scrollToSubscriptionSection,
} from '@/lib/subscription';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';

type PlanFeatureNoteProps = {
    children: ReactNode;
    className?: string;
};

/** Explains a function the current plan leaves out, linking to Ajustes to change plan (#237). */
export function PlanFeatureNote({ children, className }: PlanFeatureNoteProps) {
    return (
        <p
            className={cn(
                'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground',
                className,
            )}
        >
            <Lock className="size-4 shrink-0" aria-hidden />
            <span>{children}</span>
            <Link
                to="/ajustes"
                hash={SUBSCRIPTION_SECTION_ID}
                onClick={scrollToSubscriptionSection}
                className={cn(buttonVariants({ size: 'sm', variant: 'link' }))}
            >
                Ver planes
            </Link>
        </p>
    );
}
