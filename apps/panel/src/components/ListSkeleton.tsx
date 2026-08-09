import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ListSkeletonProps = {
    rows?: number;
    className?: string;
};

export function ListSkeleton({ rows = 3, className }: ListSkeletonProps) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn('space-y-3', className)}
        >
            <span className="sr-only">Cargando…</span>

            <div aria-hidden="true" className="space-y-3">
                {Array.from({ length: rows }, (_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                ))}
            </div>
        </div>
    );
}
