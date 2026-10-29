import { Skeleton } from '@/components/ui/skeleton';

// Stands in for a card list: the grid of the loaded cards, in its columns.
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
    return (
        <div role="status" aria-busy="true">
            <span className="sr-only">Cargando…</span>

            <div
                aria-hidden="true"
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
                {Array.from({ length: cards }, (_, index) => (
                    <div
                        key={index}
                        className="flex flex-col gap-4 rounded-3xl border p-6"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                        <Skeleton className="h-7 w-1/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}
