import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundState } from './NotFoundState';

// Mounted the way the app does: as the not-found fallback of an unknown URL.
function renderUnknownUrl(initialEntries: string[]) {
    const rootRoute = createRootRoute();
    const overviewRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <div>Página de resumen</div>,
    });
    const usersRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/usuarios',
        component: () => <div>Página de usuarios</div>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([overviewRoute, usersRoute]),
        history: createMemoryHistory({ initialEntries }),
        defaultNotFoundComponent: NotFoundState,
    });

    render(<RouterProvider router={router} />);
}

describe('NotFoundState', () => {
    it('renders the Spanish not-found copy', async () => {
        renderUnknownUrl(['/recetas']);

        expect(
            await screen.findByText('No encontramos esta página'),
        ).not.toBeNull();
        expect(
            screen.getByText(
                'Puede que el enlace esté mal escrito o que la página ya no exista.',
            ),
        ).not.toBeNull();
    });

    it('links to the overview', async () => {
        renderUnknownUrl(['/recetas']);

        // Base UI's Button keeps role="button" on the composed <a>.
        const link = (await screen.findByText('Ir al resumen')).closest('a');
        expect(link?.getAttribute('href')).toBe('/');

        fireEvent.click(link!);
        expect(await screen.findByText('Página de resumen')).not.toBeNull();
    });

    it('goes back to the previous page on "Volver"', async () => {
        renderUnknownUrl(['/usuarios', '/xyz']);

        fireEvent.click(await screen.findByRole('button', { name: 'Volver' }));

        expect(await screen.findByText('Página de usuarios')).not.toBeNull();
    });

    it('hides "Volver" when there is no previous page in the dashboard', async () => {
        renderUnknownUrl(['/xyz']);

        await screen.findByText('No encontramos esta página');
        expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    });
});
