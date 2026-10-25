import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import {
    EmptyIllustration,
    type EmptyIllustrationName,
} from './EmptyIllustration';

type EmptyStateProps = {
    illustration: EmptyIllustrationName;
    title: string;
    description?: ReactNode;
    /** The way forward: one button, or several in a fragment. */
    action?: ReactNode;
    /**
     * `page` stands in for a page's whole content, with its title as the
     * page's next heading; `section` sits inside a card that already has one.
     */
    size?: 'page' | 'section';
    /** Its own card; off when the page already wraps it in one. Defaults to `size === 'page'`. */
    framed?: boolean;
};

/** What a list or a page says while it has nothing to show (#305): a drawing, what's missing, and the step that fills it. */
export function EmptyState({
    illustration,
    title,
    description,
    action,
    size = 'page',
    framed = size === 'page',
}: EmptyStateProps) {
    const page = size === 'page';
    const Title = page ? 'h2' : 'p';

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                page ? 'gap-6 px-4 py-10' : 'gap-4 px-2 py-6',
                framed && 'rounded-3xl border bg-card shadow-card',
            )}
        >
            <EmptyIllustration
                name={illustration}
                className={page ? 'w-48 sm:w-56' : 'w-28'}
            />
            <div className="grid max-w-lg gap-2">
                <Title
                    className={cn(
                        'font-heading tracking-tight text-foreground',
                        page ? 'text-2xl sm:text-3xl' : 'text-base font-medium',
                    )}
                >
                    {title}
                </Title>
                {description && (
                    <p
                        className={cn(
                            'text-muted-foreground',
                            page ? 'text-base' : 'text-sm',
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex flex-wrap justify-center gap-3">
                    {action}
                </div>
            )}
        </div>
    );
}
