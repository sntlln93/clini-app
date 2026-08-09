import { QueryErrorState } from '@/components/QueryErrorState';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';

/**
 * `reset` alone only clears the local `CatchBoundary` and never re-invokes the failed loader, which is why `retry` pairs it with `router.invalidate()`.
 * Never re-throws: no parent boundary exists above it, so re-throwing would just yield a blank screen.
 * `__root`/`_auth`/`_public` deliberately have no `errorComponent` of their own — see ADR 0009.
 */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
    const router = useRouter();

    const retry = () => {
        void router.invalidate();
        reset();
    };

    return <QueryErrorState error={error} onRetry={retry} />;
}
