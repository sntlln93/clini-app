import { QueryErrorState } from '@/components/QueryErrorState';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';

/**
 * `reset` alone only clears the local `CatchBoundary` and never re-invokes the failed loader, which is why `retry` pairs it with `router.invalidate()`.
 * `router.invalidate()` never rejects even if the loader fails again — it resolves once the reload settles, leaving the failed match back in
 * `status: 'error'`. `retry` awaits it and only calls `reset()` once the reload has actually settled and the route is no longer in error; if it
 * failed again, the boundary stays mounted so the new error is caught here instead of unmounting the app with nothing above it to catch it.
 * Never re-throws: no parent boundary exists above it, so re-throwing would just yield a blank screen.
 * `__root`/`_auth`/`_public` deliberately have no `errorComponent` of their own — see ADR 0009.
 */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
    const router = useRouter();

    const retry = () => {
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

    return <QueryErrorState error={error} onRetry={retry} />;
}
