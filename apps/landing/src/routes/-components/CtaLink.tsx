import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type CtaLinkProps = {
    href: string;
    variant?: 'default' | 'outline';
    size?: 'md' | 'sm';
    className?: string;
    children: ReactNode;
};

/** The page's pill-shaped call to action, rendered as a plain link. */
export function CtaLink({
    href,
    variant = 'default',
    size = 'md',
    className,
    children,
}: CtaLinkProps) {
    // A plain anchor styled as a button (shadcn's documented pattern for
    // links): another app, an in-page section or a full page load of
    // /contacto, never a client-side route change.
    return (
        <a
            href={href}
            className={cn(
                buttonVariants({ variant }),
                'rounded-full font-medium',
                size === 'md' ? 'h-12 px-6 text-[0.95rem]' : 'h-10 px-4',
                variant === 'outline' && 'bg-transparent',
                className,
            )}
        >
            {children}
        </a>
    );
}
