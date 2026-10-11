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

// For a loader-only read of another page (#273). A refetch is not enough there:
// `ensureQueryData` resolves with the cached entry even while a refetch is in
// flight, so reaching that page before it lands keeps the old data with nothing
// to hand it the answer. Dropping the entry makes that loader fetch it instead.
// Call it before `refreshPageData`, whose `router.invalidate()` re-runs that
// loader too if the user already went there while the mutation was saving.
export function discardPageData(
    queryClient: QueryClient,
    ...queryKeys: QueryKey[]
): void {
    for (const queryKey of queryKeys) {
        queryClient.removeQueries({ queryKey });
    }
}
