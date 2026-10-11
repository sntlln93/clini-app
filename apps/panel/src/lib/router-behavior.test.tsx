import { QueryClient } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshPageData } from './page-data';
import { routerBehavior } from './router-behavior';

function renderPage() {
    const rootRoute = createRootRoute();
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        loader: () => ({ loadedAt: performance.now() }),
        component: () => <p>Página</p>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([pageRoute]),
        history: createMemoryHistory({ initialEntries: ['/'] }),
        ...routerBehavior,
    });

    render(<RouterProvider router={router} />);

    return router;
}

describe('routerBehavior', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(window, 'scrollY', {
            configurable: true,
            value: 0,
        });
    });

    // #279: the reload `refreshPageData` runs after a mutation is not a navigation.
    it('keeps the window scroll when a refresh reloads the page', async () => {
        // jsdom has no scrollTo; the spy also records what the router asks for.
        const scrollTo = vi
            .spyOn(window, 'scrollTo')
            .mockImplementation(() => {});
        const router = renderPage();
        await screen.findByText('Página');

        Object.defineProperty(window, 'scrollY', {
            configurable: true,
            value: 500,
        });
        document.dispatchEvent(new Event('scroll'));
        scrollTo.mockClear();

        await act(() => refreshPageData(new QueryClient(), router));

        expect(scrollTo).not.toHaveBeenCalledWith(
            expect.objectContaining({ top: 0 }),
        );
        expect(scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ top: 500 }),
        );
    });
});
