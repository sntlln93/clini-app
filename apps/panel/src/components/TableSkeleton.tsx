import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TableSkeletonProps = {
    rows?: number;
    columns?: number;
    className?: string;
};

/**
 * Loading placeholder that occupies the same bordered box a real table
 * would, for use in place of the whole `overflow-auto rounded-md border`
 * table wrapper while a query is pending.
 */
export function TableSkeleton({
    rows = 5,
    columns = 4,
    className,
}: TableSkeletonProps) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn('overflow-auto rounded-md border', className)}
        >
            <span className="sr-only">Cargando…</span>

            <div aria-hidden="true" className="divide-y">
                <div className="flex gap-4 p-3">
                    {Array.from({ length: columns }, (_, index) => (
                        <Skeleton key={index} className="h-4 flex-1" />
                    ))}
                </div>

                {Array.from({ length: rows }, (_, rowIndex) => (
                    <div key={rowIndex} className="flex gap-4 p-3">
                        {Array.from({ length: columns }, (_, colIndex) => (
                            <Skeleton key={colIndex} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
