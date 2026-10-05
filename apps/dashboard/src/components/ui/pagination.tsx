import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    MoreHorizontalIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';

function Pagination({ className, ...props }: ComponentProps<'nav'>) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            data-slot="pagination"
            className={cn('mx-auto flex w-full justify-center', className)}
            {...props}
        />
    );
}

function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn('flex items-center gap-0.5', className)}
            {...props}
        />
    );
}

function PaginationItem({ ...props }: ComponentProps<'li'>) {
    return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = ComponentProps<typeof Button> & {
    isActive?: boolean;
};

function PaginationLink({
    className,
    isActive,
    variant,
    size = 'icon',
    ...props
}: PaginationLinkProps) {
    return (
        <Button
            type="button"
            aria-current={isActive ? 'page' : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            variant={variant ?? (isActive ? 'outline' : 'ghost')}
            size={size}
            className={cn(className)}
            {...props}
        />
    );
}

function PaginationPrevious({
    className,
    text = 'Anterior',
    ...props
}: ComponentProps<typeof PaginationLink> & { text?: string }) {
    return (
        <PaginationLink
            aria-label="Ir a la página anterior"
            size="default"
            className={cn('pl-1.5!', className)}
            {...props}
        >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">{text}</span>
        </PaginationLink>
    );
}

function PaginationNext({
    className,
    text = 'Siguiente',
    ...props
}: ComponentProps<typeof PaginationLink> & { text?: string }) {
    return (
        <PaginationLink
            aria-label="Ir a la página siguiente"
            size="default"
            className={cn('pr-1.5!', className)}
            {...props}
        >
            <span className="hidden sm:block">{text}</span>
            <ChevronRightIcon data-icon="inline-end" />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn(
                "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <MoreHorizontalIcon />
            <span className="sr-only">Más páginas</span>
        </span>
    );
}

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
};
