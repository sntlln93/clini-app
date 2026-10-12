import { QueryErrorState } from '@/components/QueryErrorState';
import { useRouteRetry } from '@/hooks/use-route-retry';
import type { ErrorComponentProps } from '@tanstack/react-router';

/**
 * Retries through `useRouteRetry`, which re-runs the failed loader before clearing the boundary.
 * Never re-throws: no parent boundary exists above it, so re-throwing would just yield a blank screen.
 * `__root`/`_auth`/`_public`/`_open` deliberately have no `errorComponent` of their own — see ADR 0009.
 */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
    const retry = useRouteRetry(reset);

    return <QueryErrorState error={error} onRetry={retry} />;
}
