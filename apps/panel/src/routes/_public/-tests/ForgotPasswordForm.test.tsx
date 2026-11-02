import { api, refreshCsrfCookie } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '../-components/ForgotPasswordForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(() => Promise.resolve({ data: '' })),
}));

vi.mock('@/lib/toast', () => ({ notifySuccess: vi.fn() }));

function httpError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

function renderAt(initialPath: string) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const routeTree = rootRoute.addChildren([
        createRoute({
            getParentRoute: () => rootRoute,
            path: '/recuperar-contrasena',
            component: ForgotPasswordForm,
        }),
        createRoute({
            getParentRoute: () => rootRoute,
            path: '/login',
            component: () => <div>Pantalla de login</div>,
        }),
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [initialPath] }),
    });
    render(<RouterProvider router={router} />);

    return { router };
}

beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(refreshCsrfCookie).mockClear();
    vi.mocked(notifySuccess).mockClear();
});

describe('ForgotPasswordForm', () => {
    async function askForLink(email: string) {
        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: email },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    }

    it('asks for the link and says the same thing whatever the address', async () => {
        vi.mocked(api.post).mockResolvedValue({ status: 202, data: '' });
        renderAt('/recuperar-contrasena');

        await askForLink('ana@clini.app');

        expect(
            await screen.findByText(
                /Si hay una cuenta con ese correo, te enviamos un enlace/,
            ),
        ).not.toBeNull();
        expect(refreshCsrfCookie).toHaveBeenCalled();
        expect(api.post).toHaveBeenCalledWith('/password-reset-links', {
            email: 'ana@clini.app',
        });
        expect(
            screen
                .getByRole('link', { name: 'Iniciá sesión' })
                .getAttribute('href'),
        ).toBe('/login');
        // The form that held focus is gone: focus moves to the confirmation.
        expect(document.activeElement).toBe(
            screen.getByRole('heading', { name: 'Revisá tu correo' }),
        );
    });

    it('asks for the address before sending', async () => {
        renderAt('/recuperar-contrasena');

        await askForLink('');

        expect(
            await screen.findByText('El correo es obligatorio.'),
        ).not.toBeNull();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('says when there were too many requests', async () => {
        vi.mocked(api.post).mockRejectedValue(
            httpError(429, { message: 'Too Many Attempts.' }),
        );
        renderAt('/recuperar-contrasena');

        await askForLink('ana@clini.app');

        expect(
            await screen.findByText(
                'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
            ),
        ).not.toBeNull();
        expect(screen.queryByText(/te enviamos un enlace/)).toBeNull();
    });
});
