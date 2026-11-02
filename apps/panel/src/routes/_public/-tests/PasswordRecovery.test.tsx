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
import { ForgotPasswordForm } from '../-components/ForgotPasswordForm';
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
        const { router } = renderAt('/restablecer-contrasena/token-del-mail');

        await fillAndSubmit();

        await waitFor(() =>
            expect(router.state.location.pathname).toBe('/login'),
        );
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
