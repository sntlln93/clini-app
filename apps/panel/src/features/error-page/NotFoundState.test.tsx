import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ERROR_PAGE_COPY, HOME_ACTION } from './error-page-config';
import { NotFoundState } from './NotFoundState';

// Mounted the way the app does: as the not-found fallback of an unknown URL.
function renderUnknownUrl(initialEntries: string[]) {
    const rootRoute = createRootRoute();
    const homeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: HOME_ACTION.to,
        component: () => <div>Página de inicio</div>,
    });
    const pacientesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes',
        component: () => <div>Página de pacientes</div>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([homeRoute, pacientesRoute]),
        history: createMemoryHistory({ initialEntries }),
        defaultNotFoundComponent: NotFoundState,
    });

    render(<RouterProvider router={router} />);
}

describe('NotFoundState', () => {
    it('renders the not-found page', async () => {
        renderUnknownUrl(['/inexistente']);

        expect(
            await screen.findByRole('heading', {
                name: ERROR_PAGE_COPY.not_found.title,
            }),
        ).not.toBeNull();
        expect(
            screen.getByText(ERROR_PAGE_COPY.not_found.description),
        ).not.toBeNull();
        expect(screen.getByText('Error 404')).not.toBeNull();
    });

    it('links home', async () => {
        renderUnknownUrl(['/inexistente']);

        // Base UI's Button keeps role="button" on the composed <a>.
        const link = (await screen.findByText(HOME_ACTION.label)).closest('a');
        expect(link?.getAttribute('href')).toBe(HOME_ACTION.to);

        fireEvent.click(link!);
        expect(await screen.findByText('Página de inicio')).not.toBeNull();
    });

    it('goes back to the previous page on "Volver atrás"', async () => {
        renderUnknownUrl(['/pacientes', '/xyz']);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Volver atrás' }),
        );

        expect(await screen.findByText('Página de pacientes')).not.toBeNull();
    });

    it('hides "Volver atrás" when there is no previous page in the panel', async () => {
        renderUnknownUrl(['/xyz']);

        await screen.findByText(ERROR_PAGE_COPY.not_found.title);
        expect(
            screen.queryByRole('button', { name: 'Volver atrás' }),
        ).toBeNull();
    });
});
