import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

type RenderRouteOptions = {
    /** The path the component under test is mounted at (and first visited). */
    path?: string;
    /** Extra paths that only render "Página <path>", so links can be followed. */
    linkTargets?: string[];
    queryClient?: QueryClient;
};

/** Mounts `ui` inside a memory router + QueryClient, the way a page renders it. */
export async function renderRoute(
    ui: ReactNode,
    { path = '/', linkTargets = [], queryClient }: RenderRouteOptions = {},
) {
    const client =
        queryClient ??
        new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={client}>
                <Outlet />
                <span data-testid="route-ready" hidden />
            </QueryClientProvider>
        ),
    });
    const mainRoute = createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => <>{ui}</>,
    });
    const stubRoutes = linkTargets.map((target) =>
        createRoute({
            getParentRoute: () => rootRoute,
            path: target,
            component: () => <div>Página {target}</div>,
        }),
    );
    const router = createRouter({
        routeTree: rootRoute.addChildren([mainRoute, ...stubRoutes]),
        history: createMemoryHistory({ initialEntries: [path] }),
    });

    render(<RouterProvider router={router} />);
    await screen.findByTestId('route-ready');

    return { router, queryClient: client };
}
