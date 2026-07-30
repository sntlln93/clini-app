import { QueryErrorState } from '@/components/QueryErrorState';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';

/**
 * Shared `errorComponent` for routes whose loader failed to resolve a page
 * read. Reuses `QueryErrorState`'s presentation and recovery actions — no
 * parallel component, and `__root`/`_auth`/`_public` deliberately keep
 * having no `errorComponent`/`notFoundComponent` of their own (see ADR
 * 0009): every module route composes its own recovery UI here instead.
 *
 * `error` arrives typed as `Error` by `ErrorComponentProps`, but the real
 * value can be anything a loader threw — `mapToAppError` (inside
 * `QueryErrorState`) is the type guard that narrows it into a proper
 * `AppError` before any copy is resolved. This component never re-throws:
 * doing so would just hand the failure to a parent boundary that doesn't
 * exist, back to a blank screen.
 *
 * `reset` alone only clears the local `CatchBoundary` render state — it
 * never re-invokes the failed route's loader, so a loader that keeps
 * failing would leave the boundary stuck. `router.invalidate()` is
 * TanStack's documented pairing to actually re-run the loader before
 * clearing the boundary; a render-time error (no loader involved) still
 * recovers because `reset` alone is enough for that case.
 */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
    const router = useRouter();

    const retry = () => {
        void router.invalidate();
        reset();
    };

    return <QueryErrorState error={error} onRetry={retry} />;
}
