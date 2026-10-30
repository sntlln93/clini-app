import { api } from '@/lib/api';
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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../-components/LoginForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(() => Promise.resolve({ data: '' })),
}));

const SESSION_USER = {
    id: 7,
    name: 'Julián',
    email: 'julian@clini.app',
    two_factor_enabled: true,
};

function businessError(code: string, status = 409) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { code, message: code, context: {} } },
        },
    };
}

function renderLoginForm() {
    const queryClient = new QueryClient();
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
        component: () => <LoginForm />,
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const registerRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/registro',
        component: () => <div>Registro</div>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([
            loginRoute,
            agendaRoute,
            registerRoute,
        ]),
        history: createMemoryHistory({ initialEntries: ['/login'] }),
    });
    render(<RouterProvider router={router} />);

    return { queryClient };
}

async function passPasswordStep() {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { two_factor: true } });
    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
        target: { value: 'julian@clini.app' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: 'secreta123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    return screen.findByLabelText('Código de verificación');
}

describe('LoginForm with two-factor authentication', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('asks for the code after the password and does not sign in yet', async () => {
        const { queryClient } = renderLoginForm();

        await passPasswordStep();

        screen.getByRole('heading', { name: 'Verificación en dos pasos' });
        expect(
            queryClient.getQueryData(sessionQueryOptions.queryKey),
        ).toBeUndefined();
        expect(screen.queryByText('Agenda')).toBeNull();
    });

    it('sends the code to POST /login/two-factor and enters the agenda with the session it answers', async () => {
        const { queryClient } = renderLoginForm();
        const codeInput = await passPasswordStep();

        vi.mocked(api.post).mockResolvedValueOnce({ data: SESSION_USER });
        fireEvent.change(codeInput, { target: { value: '123 456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await screen.findByText('Agenda');
        expect(api.post).toHaveBeenLastCalledWith('/login/two-factor', {
            code: '123 456',
        });
        expect(queryClient.getQueryData(sessionQueryOptions.queryKey)).toEqual(
            SESSION_USER,
        );
    });

    it('checks the code has six digits before sending it', async () => {
        renderLoginForm();
        const codeInput = await passPasswordStep();

        fireEvent.change(codeInput, { target: { value: '12a' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await screen.findByText('El código tiene 6 números.');
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('shows a rejected code on the field and stays on the step', async () => {
        renderLoginForm();
        const codeInput = await passPasswordStep();

        vi.mocked(api.post).mockRejectedValueOnce(
            businessError('auth.two_factor_code_invalid'),
        );
        fireEvent.change(codeInput, { target: { value: '000000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await screen.findByText(
            'El código no es válido o ya se usó. Probá con el código que muestra ahora tu app.',
        );
        screen.getByLabelText('Código de verificación');
    });

    it('sends a recovery code instead when the user switches to it', async () => {
        renderLoginForm();
        await passPasswordStep();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Usar un código de recuperación',
            }),
        );
        vi.mocked(api.post).mockResolvedValueOnce({ data: SESSION_USER });
        fireEvent.change(screen.getByLabelText('Código de recuperación'), {
            target: { value: 'abcde-fghjk' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await screen.findByText('Agenda');
        expect(api.post).toHaveBeenLastCalledWith('/login/two-factor', {
            recovery_code: 'abcde-fghjk',
        });
    });

    it('goes back to the password, saying why, when the pending login expired', async () => {
        renderLoginForm();
        const codeInput = await passPasswordStep();

        vi.mocked(api.post).mockRejectedValueOnce(
            businessError('auth.two_factor_challenge_expired'),
        );
        fireEvent.change(codeInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await screen.findByText(
            'El inicio de sesión venció. Ingresá de nuevo tu correo y tu contraseña.',
        );
        await waitFor(() =>
            expect(screen.getByLabelText('Contraseña')).toBeTruthy(),
        );
    });
});
