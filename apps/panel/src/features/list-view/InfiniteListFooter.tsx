import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLoadMoreOnScroll } from './use-load-more-on-scroll';

type InfiniteListFooterProps = {
    loaded: number;
    total: number;
    /** Plural noun of the listed items, e.g. «pacientes». */
    noun: string;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => unknown;
};

// The end of a card list: the scroll trigger for the next page, how much is
// shown, and a button to load more for whoever doesn't scroll to it.
export function InfiniteListFooter({
    loaded,
    total,
    noun,
    ...query
}: InfiniteListFooterProps) {
    const sentinelRef = useLoadMoreOnScroll(query);
    const { hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;

    return (
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div ref={sentinelRef} aria-hidden="true" />
            <p aria-live="polite">
                Mostrando {loaded} de {total} {noun}
            </p>
            {isFetchingNextPage ? (
                <Spinner />
            ) : isFetchNextPageError ? (
                <>
                    <p role="alert">No se pudieron cargar más {noun}.</p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void query.fetchNextPage()}
                    >
                        Reintentar
                    </Button>
                </>
            ) : (
                hasNextPage && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void query.fetchNextPage()}
                    >
                        Cargar más
                    </Button>
                )
            )}
        </div>
    );
}
