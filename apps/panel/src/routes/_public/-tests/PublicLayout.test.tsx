import { PublicLayout } from '@/layouts/PublicLayout';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// Mounted as a route component (via `Outlet`) because `useRouteFocus` needs real router context.
function renderPublicLayout() {
    const rootRoute = createRootRoute({ component: PublicLayout });
    const childRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <div>Contenido</div>,
    });
    const routeTree = rootRoute.addChildren([childRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(<RouterProvider router={router} />);
}

describe('PublicLayout', () => {
    it('renders a main landmark that keeps tabindex="-1"', async () => {
        renderPublicLayout();

        const main = await screen.findByRole('main');
        expect(main.getAttribute('tabindex')).toBe('-1');
    });
});
