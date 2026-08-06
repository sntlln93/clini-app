import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

function domainError(status: number, code: string) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { code, message: 'x', context: {} } },
        },
    };
}

function renderQueryErrorState(
    props: Omit<Parameters<typeof QueryErrorState>[0], 'error'> & {
        error: unknown;
    },
) {
    const rootRoute = createRootRoute();
    const currentRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/current',
        component: () => <QueryErrorState {...props} />,
    });
    const homeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <div>Inicio</div>,
    });
    const routeTree = rootRoute.addChildren([homeRoute, currentRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/', '/current'] }),
    });

    render(<RouterProvider router={router} />);
}

describe('QueryErrorState', () => {
    it('renders the no-active-organization message for the organizations.no_active_membership domain error, regardless of which section renders it', async () => {
        renderQueryErrorState({
            error: domainError(403, 'organizations.no_active_membership'),
        });

        expect(
            await screen.findByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador.',
            ),
        ).not.toBeNull();
    });

    it('renders the re-authentication message for a 401 axios error with no domain envelope', async () => {
        renderQueryErrorState({
            error: { isAxiosError: true, response: { status: 401, data: {} } },
        });

        expect(
            await screen.findByText(
                'Tu sesión no es válida. Iniciá sesión nuevamente.',
            ),
        ).not.toBeNull();
        expect(
            screen.queryByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).toBeNull();
    });

    it('renders the generic message for a 500 axios error with no domain envelope', async () => {
        renderQueryErrorState({
            error: { isAxiosError: true, response: { status: 500, data: {} } },
        });

        expect(
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the permissions message for a 403 axios error with no domain envelope', async () => {
        renderQueryErrorState({
            error: { isAxiosError: true, response: { status: 403, data: {} } },
        });

        expect(
            await screen.findByText(
                'No tenés permiso para ver esta sección. Pedí acceso a un administrador.',
            ),
        ).not.toBeNull();
        expect(
            screen.queryByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', async () => {
        renderQueryErrorState({ error: new Error('boom') });

        expect(
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders a retry button only when onRetry is provided, and calls it on click', async () => {
        const onRetry = vi.fn();
        renderQueryErrorState({ error: new Error('boom'), onRetry });

        const retryButton = await screen.findByRole('button', {
            name: 'Reintentar',
        });
        retryButton.click();

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render a retry button when onRetry is not provided', async () => {
        renderQueryErrorState({ error: new Error('boom') });

        await screen.findByText(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
        expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    });

    it('always renders go-back and go-home actions', async () => {
        renderQueryErrorState({ error: new Error('boom') });

        expect(
            await screen.findByRole('button', { name: 'Volver' }),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Ir al inicio' }),
        ).not.toBeNull();
    });

    it('navigates home when "Ir al inicio" is clicked', async () => {
        renderQueryErrorState({ error: new Error('boom') });

        const homeButton = await screen.findByRole('button', {
            name: 'Ir al inicio',
        });
        homeButton.click();

        expect(await screen.findByText('Inicio')).not.toBeNull();
    });

    it('focuses the error container on mount and marks it as a focus target', async () => {
        renderQueryErrorState({ error: new Error('boom') });

        const container = (
            await screen.findByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            )
        ).parentElement;

        expect(document.activeElement).toBe(container);
        expect(container?.getAttribute('tabindex')).toBe('-1');
    });
});
