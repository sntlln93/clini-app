import { cn } from '@/lib/utils';
import { useId, type ReactNode } from 'react';

type SectionProps = {
    id?: string;
    eyebrow: string;
    title: ReactNode;
    lead?: ReactNode;
    children: ReactNode;
    className?: string;
};

/**
 * The page's recurring layout: a narrow left rail carries the eyebrow (like
 * the time ruler of an agenda), the content takes the rest.
 */
export function Section({
    id,
    eyebrow,
    title,
    lead,
    children,
    className,
}: SectionProps) {
    const titleId = useId();

    return (
        <section
            id={id}
            aria-labelledby={titleId}
            className={cn('py-16', className)}
        >
            <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[7.5rem_1fr] md:gap-8">
                <span className="text-muted-foreground">{eyebrow}</span>
                <div>
                    <h2
                        id={titleId}
                        className="max-w-[22ch] text-3xl leading-tight tracking-tight md:text-[2.75rem]"
                    >
                        {title}
                    </h2>
                    {lead && (
                        <p className="mt-4 max-w-[60ch] text-xl leading-snug font-light text-muted-foreground">
                            {lead}
                        </p>
                    )}
                </div>
            </div>
            {children}
        </section>
    );
}

/** Content aligned with the section title, past the left rail. */
export function Indented({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[7.5rem_1fr] md:gap-8">
            <div className="min-w-0 md:col-start-2">{children}</div>
        </div>
    );
}
