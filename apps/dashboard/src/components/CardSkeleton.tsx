import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type CardSkeletonProps = {
    className?: string;
};

/** Loading placeholder shaped like a centered single-card page: a title, two lines and a full-width button. */
export function CardSkeleton({ className }: CardSkeletonProps) {
    return (
        <div role="status" aria-busy="true" className={cn('w-full', className)}>
            <span className="sr-only">Cargando…</span>

            <div aria-hidden="true" className="space-y-3">
                <Skeleton className="mx-auto h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}
