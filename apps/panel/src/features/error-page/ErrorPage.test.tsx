import { api } from '@/lib/api';
import { reloadPage } from '@/lib/external-navigation';
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
import { ErrorPage } from './ErrorPage';
import { ERROR_PAGE_COPY, HOME_ACTION } from './error-page-config';
import type { ErrorPageVariant } from './error-page-variant';

vi.mock('@/lib/external-navigation', () => ({ reloadPage: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(() => Promise.resolve()) } }));
vi.mock('./error-page-config', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./error-page-config')>()),
    HELP_URL: 'https://clini.test/contacto',
}));

function httpError(status: number, data: unknown = {}) {
    return { isAxiosError: true, response: { status, data } };
}

function renderErrorPage(
    props: Parameters<typeof ErrorPage>[0],
    initialEntries = ['/', '/current?fecha=2026-10-05'],
) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['session'], { id: 1 });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const pages = ['/', '/login', HOME_ACTION.to]
        .filter((path, index, all) => all.indexOf(path) === index)
        .map((path) =>
            createRoute({
                getParentRoute: () => rootRoute,
                path,
                component: () => <div>Página {path}</div>,
            }),
        );
    const currentRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/current',
        component: () => <ErrorPage {...props} />,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([...pages, currentRoute]),
        history: createMemoryHistory({ initialEntries }),
    });

    render(<RouterProvider router={router} />);

    return { queryClient, router };
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('ErrorPage', () => {
    it.each<[string, unknown, ErrorPageVariant, string]>([
        ['a 400', httpError(400), 'bad_request', 'Error 400'],
        [
            'a 422 with no field to point at',
            httpError(422, {}),
            'bad_request',
            'Error 422',
        ],
        ['a 401', httpError(401), 'unauthorized', 'Error 401'],
        ['a 403', httpError(403), 'forbidden', 'Error 403'],
        ['a 404', httpError(404), 'not_found', 'Error 404'],
        ['a 408', httpError(408), 'timeout', 'Error 408'],
        ['a 419', httpError(419), 'session_expired', 'Error 419'],
        ['a 429', httpError(429), 'rate_limited', 'Error 429'],
        ['a 500', httpError(500), 'server', 'Error 500'],
        [
            'a crash in the page',
            new Error('boom'),
            'server',
            'Error inesperado',
        ],
        ['a 503', httpError(503), 'unavailable', 'Error 503'],
        [
            'an API that never answers',
            { isAxiosError: true },
            'unavailable',
            'Sin respuesta',
        ],
    ])('shows its own page for %s', async (_case, error, variant, eyebrow) => {
        renderErrorPage({ error });

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: ERROR_PAGE_COPY[variant].title,
            }),
        ).not.toBeNull();
        expect(
            screen.getByText(ERROR_PAGE_COPY[variant].description),
        ).not.toBeNull();
        expect(screen.getByText(eyebrow)).not.toBeNull();
    });

    it('shows the offline page when the browser has no connection', async () => {
        vi.stubGlobal('navigator', { ...navigator, onLine: false });
        renderErrorPage({ error: { isAxiosError: true } });

        expect(
            await screen.findByRole('heading', {
                name: ERROR_PAGE_COPY.offline.title,
            }),
        ).not.toBeNull();
        expect(screen.getByText('Sin conexión')).not.toBeNull();
    });

    it("tells a business rule in its catalog's words, on the page its status picks", async () => {
        renderErrorPage({
            error: httpError(403, {
                error: {
                    code: 'organizations.no_active_membership',
                    message: 'x',
                    context: {},
                },
            }),
        });

        expect(
            await screen.findByRole('heading', {
                name: ERROR_PAGE_COPY.forbidden.title,
            }),
        ).not.toBeNull();
        expect(
            screen.getByText(/no tiene una organización activa/),
        ).not.toBeNull();
    });

    it('is the not-found page when asked for it, with no error at hand', async () => {
        renderErrorPage({ variant: 'not_found' });

        expect(
            await screen.findByRole('heading', {
                name: ERROR_PAGE_COPY.not_found.title,
            }),
        ).not.toBeNull();
        expect(screen.getByText('Error 404')).not.toBeNull();
    });

    it('draws a decorative illustration that assistive technology skips', async () => {
        renderErrorPage({ error: httpError(500) });

        await screen.findByRole('heading', { level: 1 });
        expect(
            document.querySelector('svg[aria-hidden="true"]'),
        ).not.toBeNull();
    });

    it('focuses the page on mount so a screen reader starts there', async () => {
        renderErrorPage({ error: httpError(500) });

        const heading = await screen.findByRole('heading', { level: 1 });
        expect(document.activeElement?.contains(heading)).toBe(true);
        expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    });

    it('links to help, and hints at insisting only where waiting may fix it', async () => {
        renderErrorPage({ error: httpError(500) });

        const link = await screen.findByRole('link', { name: 'contactanos' });
        expect(link.getAttribute('href')).toBe('https://clini.test/contacto');
    });

    describe('actions', () => {
        afterEach(() => {
            vi.mocked(reloadPage).mockClear();
        });

        it('retries through onRetry, and reloads the page without one', async () => {
            const onRetry = vi.fn();
            renderErrorPage({ error: httpError(500), onRetry });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Reintentar' }),
            );
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it('reloads the page to retry when nothing can re-run what failed', async () => {
            renderErrorPage({ error: httpError(503) });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Reintentar' }),
            );
            expect(reloadPage).toHaveBeenCalledTimes(1);
        });

        it('leads home, and back only when there is somewhere to go back to', async () => {
            renderErrorPage({ variant: 'not_found' }, ['/current']);

            const home = await screen.findByRole('button', {
                name: HOME_ACTION.label,
            });
            expect(
                screen.queryByRole('button', { name: 'Volver atrás' }),
            ).toBeNull();

            fireEvent.click(home);
            expect(
                await screen.findByText(`Página ${HOME_ACTION.to}`),
            ).not.toBeNull();
        });

        it('goes back to the previous page', async () => {
            renderErrorPage({ variant: 'not_found' });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Volver atrás' }),
            );
            expect(await screen.findByText('Página /')).not.toBeNull();
        });

        it('signs in again on a 401, dropping the dead session and coming back after', async () => {
            const { queryClient, router } = renderErrorPage({
                error: httpError(401),
                onRetry: vi.fn(),
            });

            fireEvent.click(
                await screen.findByRole('button', { name: 'Iniciar sesión' }),
            );

            expect(await screen.findByText('Página /login')).not.toBeNull();
            expect(queryClient.getQueryData(['session'])).toBeUndefined();
            expect(router.state.location.search).toEqual({
                redirect: '/current?fecha=2026-10-05',
            });
            expect(
                screen.queryByRole('button', { name: 'Reintentar' }),
            ).toBeNull();
        });

        it('reloads on a 419 instead of retrying with the same stale token', async () => {
            renderErrorPage({ error: httpError(419), onRetry: vi.fn() });

            fireEvent.click(
                await screen.findByRole('button', {
                    name: 'Actualizar página',
                }),
            );

            expect(reloadPage).toHaveBeenCalledTimes(1);
            expect(
                screen.queryByRole('button', { name: 'Reintentar' }),
            ).toBeNull();
        });

        it('logs out to switch account on a 403', async () => {
            renderErrorPage({ error: httpError(403) });

            fireEvent.click(
                await screen.findByRole('button', {
                    name: 'Cambiar de cuenta',
                }),
            );

            expect(await screen.findByText('Página /login')).not.toBeNull();
            expect(api.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('in debug mode', () => {
        it("shows an unexpected error exactly, with the API's own trace", async () => {
            vi.stubEnv('VITE_APP_DEBUG', 'true');
            renderErrorPage({
                error: {
                    isAxiosError: true,
                    message: 'Request failed with status code 500',
                    response: {
                        status: 500,
                        config: {
                            method: 'get',
                            baseURL: 'http://api.test',
                            url: '/me',
                        },
                        data: {
                            message: 'Division by zero',
                            exception: 'DivisionByZeroError',
                            file: '/app/X.php',
                            line: 7,
                            trace: [
                                {
                                    file: '/app/Y.php',
                                    line: 9,
                                    function: 'run',
                                },
                            ],
                        },
                    },
                },
            });

            expect(
                await screen.findByRole('heading', {
                    level: 1,
                    name: 'Division by zero',
                }),
            ).not.toBeNull();
            expect(screen.getByText('DivisionByZeroError')).not.toBeNull();
            expect(screen.getByText('/app/X.php:7')).not.toBeNull();
            expect(
                screen.getByText('GET http://api.test/me → 500'),
            ).not.toBeNull();
            expect(screen.getByText('/app/Y.php:9 run')).not.toBeNull();
            expect(screen.queryByText(ERROR_PAGE_COPY.server.title)).toBeNull();
        });

        it('shows a crash in the page with its own stack', async () => {
            vi.stubEnv('VITE_APP_DEBUG', 'true');
            const error = new TypeError('x is undefined');
            error.stack =
                'TypeError: x is undefined\n    at Page (Page.tsx:3:9)';
            renderErrorPage({ error });

            expect(
                await screen.findByRole('heading', { name: 'x is undefined' }),
            ).not.toBeNull();
            expect(screen.getByText('at Page (Page.tsx:3:9)')).not.toBeNull();
        });

        it('keeps the friendly page for an error the user can act on, as Laravel does', async () => {
            vi.stubEnv('VITE_APP_DEBUG', 'true');
            renderErrorPage({
                error: httpError(404, { message: 'No query results' }),
            });

            expect(
                await screen.findByRole('heading', {
                    name: ERROR_PAGE_COPY.not_found.title,
                }),
            ).not.toBeNull();
            expect(screen.queryByText('No query results')).toBeNull();
        });

        it('never shows the exact error outside debug mode', async () => {
            renderErrorPage({ error: new TypeError('x is undefined') });

            expect(
                await screen.findByRole('heading', {
                    name: ERROR_PAGE_COPY.server.title,
                }),
            ).not.toBeNull();
            expect(screen.queryByText('x is undefined')).toBeNull();
        });
    });
});
