import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';

// `refetchType: 'all'` + awaiting both calls is required: ensureQueryData resolves
// stale cached data without checking invalidation, and a loader-only query has no
// active observer, so a default `invalidateQueries` refetch is a no-op.
export async function refreshPageData(
    queryClient: QueryClient,
    router: Pick<AnyRouter, 'invalidate'>,
    ...queryKeys: QueryKey[]
): Promise<void> {
    await Promise.all(
        queryKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
        ),
    );
    await router.invalidate();
}
