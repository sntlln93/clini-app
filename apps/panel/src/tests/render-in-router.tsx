import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';

/** Renders `ui` as the only page of a router, so its `Link`s resolve, under a query client. */
export function renderInRouter(
    ui: ReactNode,
    queryClient: QueryClient = new QueryClient(),
) {
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Suspense fallback={<p>Cargando…</p>}>{ui}</Suspense>
            </QueryClientProvider>
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    return render(<RouterProvider router={router} />);
}
