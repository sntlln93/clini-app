import { Route as RootRoute } from '@/routes/__root';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ERROR_PAGE_COPY } from './error-page-config';

// What no module route catches — a layout's guard, a page without its own
// `errorComponent` — used to reach the router's own English page (#304).
function renderUncaught(failure: unknown) {
    const queryClient = new QueryClient();
    const layoutRoute = createRoute({
        getParentRoute: () => RootRoute,
        id: '_layout',
        beforeLoad: () => {
            throw failure;
        },
    });
    const pageRoute = createRoute({
        getParentRoute: () => layoutRoute,
        path: '/',
        component: () => <div>Contenido</div>,
    });
    const router = createRouter({
        routeTree: RootRoute.addChildren([
            layoutRoute.addChildren([pageRoute]),
        ]),
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
}

describe('the root error page', () => {
    it('shows the error page for a failure no route caught, not the router default', async () => {
        renderUncaught({
            isAxiosError: true,
            response: { status: 503, data: {} },
        });

        expect(
            await screen.findByRole('heading', {
                name: ERROR_PAGE_COPY.unavailable.title,
            }),
        ).not.toBeNull();
        expect(screen.queryByText('Something went wrong!')).toBeNull();
        expect(screen.queryByText('Contenido')).toBeNull();
        // Nothing around it supplies the page's landmark.
        expect(screen.getByRole('main')).not.toBeNull();
    });
});
