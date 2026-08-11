import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorState } from './RouteErrorState';

// A resolvable-from-outside promise, used to keep a child route's reload "in flight"
// for as long as the test needs, so it can assert on `retry`'s ordering mid-invalidation.
function createDeferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

// Both ordering tests below verify `retry()`'s own await/branch contract — that `reset()`
// waits on `router.invalidate()` and is skipped when the reload leaves the route in error —
// not the real mount through TanStack's `CatchBoundary`/`resetKey` machinery. They use a
// parent/child route pair instead of wiring `RouteErrorState` as an `errorComponent`: the
// parent renders it directly (with an explicit, spied `reset`) and never renders an
// `<Outlet />`, so the child route's loader can independently drive `router.state.matches`
// into and out of `status: 'error'` without TanStack's built-in CatchBoundary ever
// intercepting a render — that boundary intercepts any match whose own loader fails,
// regardless of whether `errorComponent` is set, which would otherwise replace the parent's
// content with its default fallback UI.
function buildOrderingRouter(
    resetSpy: () => void,
    childLoader: () => void | Promise<void>,
) {
    const rootRoute = createRootRoute();
    const parentRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/parent',
        component: () => (
            <RouteErrorState error={new Error('boom')} reset={resetSpy} />
        ),
    });
    const childRoute = createRoute({
        getParentRoute: () => parentRoute,
        path: '/child',
        loader: childLoader,
    });
    const homeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <div>Inicio</div>,
    });
    const routeTree = rootRoute.addChildren([
        homeRoute,
        parentRoute.addChildren([childRoute]),
    ]);

    return createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: ['/', '/parent/child'],
        }),
    });
}

function domainError(status: number, code: string) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { code, message: 'x', context: {} } },
        },
    };
}

function renderRouteErrorState(error: unknown) {
    const rootRoute = createRootRoute();
    const failingRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/failing',
        loader: () => {
            throw error;
        },
        errorComponent: RouteErrorState,
    });
    const homeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <div>Inicio</div>,
    });
    const routeTree = rootRoute.addChildren([homeRoute, failingRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/', '/failing'] }),
    });

    render(<RouterProvider router={router} />);
}

describe('RouteErrorState', () => {
    it('renders the no-active-organization message for the organizations.no_active_membership domain error', async () => {
        renderRouteErrorState(
            domainError(403, 'organizations.no_active_membership'),
        );

        expect(
            await screen.findByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a 500 axios error with no domain envelope', async () => {
        renderRouteErrorState({
            isAxiosError: true,
            response: { status: 500, data: {} },
        });

        expect(
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', async () => {
        renderRouteErrorState(new Error('boom'));

        expect(
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders retry, go-back and go-home actions, and never re-throws', async () => {
        renderRouteErrorState(new Error('boom'));

        expect(
            await screen.findByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Volver' })).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Ir al inicio' }),
        ).not.toBeNull();
    });

    it('shows the recovery UI when a route component throws during render, not just the loader', async () => {
        const rootRoute = createRootRoute();
        const failingRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/failing',
            component: () => {
                throw new Error('boom');
            },
            errorComponent: RouteErrorState,
        });
        const homeRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/',
            component: () => <div>Inicio</div>,
        });
        const routeTree = rootRoute.addChildren([homeRoute, failingRoute]);
        const router = createRouter({
            routeTree,
            history: createMemoryHistory({ initialEntries: ['/', '/failing'] }),
        });

        render(<RouterProvider router={router} />);

        expect(
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();
    });

    it('re-runs the failed loader on retry instead of only clearing the boundary', async () => {
        let loaderCalls = 0;
        const rootRoute = createRootRoute();
        const failingRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/failing',
            loader: () => {
                loaderCalls += 1;
                if (loaderCalls === 1) {
                    throw new Error('boom');
                }
            },
            component: () => <div>Contenido recuperado</div>,
            errorComponent: RouteErrorState,
        });
        const homeRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/',
            component: () => <div>Inicio</div>,
        });
        const routeTree = rootRoute.addChildren([homeRoute, failingRoute]);
        const router = createRouter({
            routeTree,
            history: createMemoryHistory({ initialEntries: ['/', '/failing'] }),
        });

        render(<RouterProvider router={router} />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Reintentar' }),
        );

        expect(await screen.findByText('Contenido recuperado')).not.toBeNull();
        expect(screen.queryByText('Reintentar')).toBeNull();
        expect(loaderCalls).toBe(2);
    });

    // This encodes the user-visible contract (AC 1 and 3 of #174): the error UI must
    // never leave the tree empty when a retry fails again. It intentionally cannot fail
    // against the pre-fix `retry` (`void router.invalidate(); reset()`): with a single
    // route that always fails, TanStack's `SuspenseBoundary > CatchBoundary > MatchInner`
    // nesting keeps the already-committed error UI on screen regardless of when `reset()`
    // runs relative to `invalidate()` — see the handoff's "hallazgo del intento 1" note.
    // It is not the regression guard; the ordering tests below are.
    it('keeps showing the recovery UI when the loader fails again after retry', async () => {
        let loaderCalls = 0;
        const rootRoute = createRootRoute();
        const failingRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/failing',
            loader: () => {
                loaderCalls += 1;
                throw new Error('boom');
            },
            component: () => <div>Contenido recuperado</div>,
            errorComponent: RouteErrorState,
        });
        const homeRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: '/',
            component: () => <div>Inicio</div>,
        });
        const routeTree = rootRoute.addChildren([homeRoute, failingRoute]);
        const router = createRouter({
            routeTree,
            history: createMemoryHistory({ initialEntries: ['/', '/failing'] }),
        });

        render(<RouterProvider router={router} />);

        expect(
            await screen.findByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Reintentar' }),
        );

        expect(
            await screen.findByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Volver' })).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Ir al inicio' }),
        ).not.toBeNull();
        expect(screen.queryByText('Contenido recuperado')).toBeNull();
        expect(document.body.textContent).not.toBe('');
        expect(loaderCalls).toBeGreaterThan(1);
    });

    it('does not call reset until router.invalidate() has settled', async () => {
        const resetSpy = vi.fn();
        let loaderCalls = 0;
        const deferred = createDeferred();

        // The first call fails (mirroring the real bug: the route errored, hence
        // RouteErrorState is on screen), and only the retry-triggered second call is
        // deferred — `router.invalidate()` only awaits a match's reload synchronously
        // when that match was previously in `status: 'error'`; a background revalidation
        // of an already-successful match does not block invalidate()'s own promise.
        const router = buildOrderingRouter(resetSpy, () => {
            loaderCalls += 1;
            if (loaderCalls === 1) {
                throw new Error('child boom');
            }
            return deferred.promise;
        });

        render(<RouterProvider router={router} />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Reintentar' }),
        );

        await waitFor(() => expect(loaderCalls).toBe(2));
        expect(resetSpy).not.toHaveBeenCalled();

        deferred.resolve();

        await waitFor(() => expect(resetSpy).toHaveBeenCalledTimes(1));
    });

    it('never calls reset when the reload leaves the route in error, even once it has settled', async () => {
        const resetSpy = vi.fn();
        let loaderCalls = 0;

        const router = buildOrderingRouter(resetSpy, () => {
            loaderCalls += 1;
            if (loaderCalls > 1) {
                throw new Error('child boom');
            }
        });

        render(<RouterProvider router={router} />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Reintentar' }),
        );

        await waitFor(() => {
            expect(
                router.state.matches.some((match) => match.status === 'error'),
            ).toBe(true);
        });

        expect(resetSpy).not.toHaveBeenCalled();
    });
});
