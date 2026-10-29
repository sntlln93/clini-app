import { useEffect, useState } from 'react';

type LoadMoreOnScroll = {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => unknown;
};

/**
 * Ref for an element at the end of a list: once it nears the viewport, the
 * next page loads. A failed page waits for the user to retry, instead of
 * asking again while the element stays in sight.
 */
export function useLoadMoreOnScroll({
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
}: LoadMoreOnScroll) {
    const [sentinel, setSentinel] = useState<Element | null>(null);
    const enabled = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;

    useEffect(() => {
        if (!sentinel || !enabled) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    void fetchNextPage();
                }
            },
            { rootMargin: '0px 0px 400px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [sentinel, enabled, fetchNextPage]);

    return setSentinel;
}
