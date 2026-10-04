import type { ReactNode } from 'react';

type CardErrorStateProps = {
    title: string;
    message: string;
    /** The way out, e.g. a full-width `Button` rendering a `Link`. */
    action: ReactNode;
};

/** Error counterpart of a centered single-card page: a title, the reason and a next step, never a dead end. */
export function CardErrorState({
    title,
    message,
    action,
}: CardErrorStateProps) {
    return (
        <div className="space-y-4 text-center">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p role="alert" className="text-sm text-muted-foreground">
                    {message}
                </p>
            </div>
            {action}
        </div>
    );
}
