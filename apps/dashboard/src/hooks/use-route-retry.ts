import { useRouter } from '@tanstack/react-router';

/**
 * Retry for a route's `errorComponent`. `reset` alone only clears the local `CatchBoundary` and never re-invokes the failed loader, which is why it pairs with `router.invalidate()`.
 * `router.invalidate()` never rejects even if the loader fails again — it resolves once the reload settles, leaving the failed match back in
 * `status: 'error'`. The retry awaits it and only calls `reset()` once the reload has actually settled and the route is no longer in error; if it
 * failed again, the boundary stays mounted so the new error is caught there instead of unmounting the app with nothing above it to catch it.
 */
export function useRouteRetry(reset: () => void): () => void {
    const router = useRouter();

    return () => {
        void (async () => {
            await router.invalidate();

            const stillFailing = router.state.matches.some(
                (match) => match.status === 'error',
            );

            if (!stillFailing) {
                reset();
            }
        })();
    };
}
