import { reloadPage } from '@/lib/external-navigation';
import { sessionQueryOptions } from '@/lib/session';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

vi.mock('@/lib/external-navigation', () => ({ reloadPage: vi.fn() }));

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
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana Ejemplo',
        email: 'ana@clini.app',
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/login',
        component: () => <div>Login</div>,
    });
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
    const routeTree = rootRoute.addChildren([
        homeRoute,
        loginRoute,
        currentRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: ['/', '/current?fecha=2026-10-05'],
        }),
    });

    render(<RouterProvider router={router} />);

    return { queryClient, router };
}

const unauthorized = {
    isAxiosError: true,
    response: { status: 401, data: {} },
};
const sessionExpired = {
    isAxiosError: true,
    response: { status: 419, data: {} },
};

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

    describe('actions by error kind', () => {
        afterEach(() => {
            vi.mocked(reloadPage).mockClear();
        });

        it('offers only "Iniciar sesión" (plus Volver) for a 401, hiding retry and home', async () => {
            renderQueryErrorState({ error: unauthorized, onRetry: vi.fn() });

            expect(
                await screen.findByRole('button', { name: 'Iniciar sesión' }),
            ).not.toBeNull();
            expect(
                screen.getByRole('button', { name: 'Volver' }),
            ).not.toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Reintentar' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Ir al inicio' }),
            ).toBeNull();
        });

        it('clears the cached session and goes to /login with the current page as redirect on a 401', async () => {
            const { queryClient, router } = renderQueryErrorState({
                error: unauthorized,
            });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Iniciar sesión' }),
            );

            expect(await screen.findByText('Login')).not.toBeNull();
            expect(
                queryClient.getQueryData(sessionQueryOptions.queryKey),
            ).toBeUndefined();
            expect(router.state.location.pathname).toBe('/login');
            expect(router.state.location.search).toEqual({
                redirect: '/current?fecha=2026-10-05',
            });
        });

        it('offers "Recargar página" for a 419 and reloads on click', async () => {
            renderQueryErrorState({ error: sessionExpired, onRetry: vi.fn() });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Recargar página' }),
            );

            expect(reloadPage).toHaveBeenCalledTimes(1);
            expect(
                screen.queryByRole('button', { name: 'Reintentar' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Iniciar sesión' }),
            ).toBeNull();
        });

        it('keeps Reintentar, Volver and Ir al inicio for a 500', async () => {
            renderQueryErrorState({
                error: {
                    isAxiosError: true,
                    response: { status: 500, data: {} },
                },
                onRetry: vi.fn(),
            });

            expect(
                await screen.findByRole('button', { name: 'Reintentar' }),
            ).not.toBeNull();
            expect(
                screen.getByRole('button', { name: 'Volver' }),
            ).not.toBeNull();
            expect(
                screen.getByRole('button', { name: 'Ir al inicio' }),
            ).not.toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Iniciar sesión' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Recargar página' }),
            ).toBeNull();
        });
    });
});
