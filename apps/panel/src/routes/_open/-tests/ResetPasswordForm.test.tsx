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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordForm } from '../-components/ResetPasswordForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(() => Promise.resolve({ data: '' })),
}));

vi.mock('@/lib/toast', () => ({ notifySuccess: vi.fn() }));

const NEW_PASSWORD = 'una-clave-nueva-y-larga';

function httpError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

function renderAt(initialPath: string) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    // A session this browser had open: the reset ends it.
    queryClient.setQueryData(['session'], { id: 1 });
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
            path: '/restablecer-contrasena/$token',
            component: () => <ResetPasswordForm token="token-del-mail" />,
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

    return { router, queryClient };
}

beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(refreshCsrfCookie).mockClear();
    vi.mocked(notifySuccess).mockClear();
});

describe('ResetPasswordForm', () => {
    async function fillAndSubmit(
        password = NEW_PASSWORD,
        confirmation = password,
    ) {
        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
            target: { value: password },
        });
        fireEvent.change(screen.getByLabelText('Repetí la contraseña nueva'), {
            target: { value: confirmation },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Cambiar contraseña' }),
        );
    }

    it('sends the token from the link with the typed address and goes to the login, signed out', async () => {
        vi.mocked(api.post).mockResolvedValue({ status: 204, data: '' });
        const { router, queryClient } = renderAt(
            '/restablecer-contrasena/token-del-mail',
        );

        await fillAndSubmit();

        await waitFor(() =>
            expect(router.state.location.pathname).toBe('/login'),
        );
        expect(queryClient.getQueryData(['session'])).toBeUndefined();
        expect(api.post).toHaveBeenCalledWith('/password-resets', {
            token: 'token-del-mail',
            email: 'ana@clini.app',
            password: NEW_PASSWORD,
            password_confirmation: NEW_PASSWORD,
        });
        expect(notifySuccess).toHaveBeenCalledWith(
            'Cambiaste tu contraseña. Ingresá con la nueva para continuar.',
        );
    });

    it('asks for 12 characters and matching passwords before sending', async () => {
        renderAt('/restablecer-contrasena/token-del-mail');

        expect(await screen.findByText('Mínimo 12 caracteres.')).not.toBeNull();
        await fillAndSubmit('clave-corta');

        expect(
            await screen.findByText(
                'La contraseña debe tener al menos 12 caracteres.',
            ),
        ).not.toBeNull();

        fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
            target: { value: NEW_PASSWORD },
        });
        fireEvent.change(screen.getByLabelText('Repetí la contraseña nueva'), {
            target: { value: 'otra-clave-distinta' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Cambiar contraseña' }),
        );

        expect(
            await screen.findByText('Las contraseñas no coinciden.'),
        ).not.toBeNull();
        expect(api.post).not.toHaveBeenCalled();
    });

    it("shows the API's refusal of a breached password on the field", async () => {
        const message =
            'Esta contraseña apareció en una filtración de datos de otro sitio. Elegí otra.';
        vi.mocked(api.post).mockRejectedValue(
            httpError(422, { message, errors: { password: [message] } }),
        );
        renderAt('/restablecer-contrasena/token-del-mail');

        await fillAndSubmit();

        expect(await screen.findByText(message)).not.toBeNull();
    });

    it('offers a new link when this one is invalid or expired', async () => {
        vi.mocked(api.post).mockRejectedValue(
            httpError(404, {
                error: {
                    code: 'auth.password_reset_invalid_or_expired',
                    message:
                        'The password reset link is invalid or has expired.',
                    context: {},
                },
            }),
        );
        const { router } = renderAt('/restablecer-contrasena/token-del-mail');

        await fillAndSubmit();

        expect(
            await screen.findByText(
                'El enlace para restablecer la contraseña no es válido, ya venció o no corresponde a ese correo. Pedí uno nuevo.',
            ),
        ).not.toBeNull();
        expect(
            screen
                .getByRole('link', { name: 'Pedir un enlace nuevo' })
                .getAttribute('href'),
        ).toBe('/recuperar-contrasena');
        expect(router.state.location.pathname).toBe(
            '/restablecer-contrasena/token-del-mail',
        );
    });
});

describe('ResetPasswordForm errors that are not the link', () => {
    it('does not offer a new link when the request was only throttled', async () => {
        vi.mocked(api.post).mockRejectedValue(
            httpError(429, { message: 'Too Many Attempts.' }),
        );
        renderAt('/restablecer-contrasena/token-del-mail');

        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
            target: { value: NEW_PASSWORD },
        });
        fireEvent.change(screen.getByLabelText('Repetí la contraseña nueva'), {
            target: { value: NEW_PASSWORD },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Cambiar contraseña' }),
        );

        expect(
            await screen.findByText(
                'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
            ),
        ).not.toBeNull();
        expect(
            screen.queryByRole('link', { name: 'Pedir un enlace nuevo' }),
        ).toBeNull();
    });
});
