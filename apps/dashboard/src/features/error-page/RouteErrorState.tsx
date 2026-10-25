import { useRouteRetry } from '@/hooks/use-route-retry';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { ErrorPage } from './ErrorPage';

/**
 * A module route's `errorComponent`: the error page inside the panel chrome. Retries through `useRouteRetry`, which re-runs the failed loader before
 * clearing the boundary. Never re-throws: above it there's only the root's own page, which would drop the chrome for nothing.
 */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
    const retry = useRouteRetry(reset);

    return <ErrorPage error={error} onRetry={retry} />;
}

/** The root's `errorComponent`: whatever no module route caught (a layout, the session guard, a page without its own) — alone on the screen. */
export function RootErrorState({ error, reset }: ErrorComponentProps) {
    const retry = useRouteRetry(reset);

    return <ErrorPage error={error} onRetry={retry} fullPage />;
}
