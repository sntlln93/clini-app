import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteErrorState } from './RouteErrorState';

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
});
