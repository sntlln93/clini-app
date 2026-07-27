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
            className={cn('flex flex-row items-center gap-1', className)}
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
    ...props
}: ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Ir a la página anterior"
            size="default"
            className={cn('gap-1 px-2.5', className)}
            {...props}
        >
            <ChevronLeftIcon />
            <span>Anterior</span>
        </PaginationLink>
    );
}

function PaginationNext({
    className,
    ...props
}: ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Ir a la página siguiente"
            size="default"
            className={cn('gap-1 px-2.5', className)}
            {...props}
        >
            <span>Siguiente</span>
            <ChevronRightIcon />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn('flex size-8 items-center justify-center', className)}
            {...props}
        >
            <MoreHorizontalIcon className="size-4" />
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
