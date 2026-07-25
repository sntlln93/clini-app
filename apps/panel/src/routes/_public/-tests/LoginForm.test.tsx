import { api } from '@/lib/api';
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
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../-components/LoginForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
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
        component: LoginForm,
    });
    const registerRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/registro',
        component: () => <div>Registro</div>,
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const routeTree = rootRoute.addChildren([
        loginRoute,
        registerRoute,
        agendaRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/login'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('LoginForm', () => {
    it('sends email and password to POST /login on submit', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { id: 1, name: 'Ana', email: 'ana@clini.app' },
        });
        renderLoginForm();

        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'secreta123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/login', {
                email: 'ana@clini.app',
                password: 'secreta123',
            }),
        );
    });

    it('renders per-field errors from a 422 and keeps the typed values', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({
                message: 'Los datos ingresados no son válidos.',
                errors: {
                    email: ['El correo no es válido.'],
                    password: ['La contraseña es obligatoria.'],
                },
            }),
        );
        renderLoginForm();

        const emailInput = await screen.findByLabelText('Correo electrónico');
        const passwordInput = screen.getByLabelText('Contraseña');
        fireEvent.change(emailInput, {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(passwordInput, {
            target: { value: 'contraseña-incorrecta' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

        await screen.findByText('El correo no es válido.');
        screen.getByText('La contraseña es obligatoria.');
        expect((emailInput as HTMLInputElement).value).toBe('ana@clini.app');
        expect((passwordInput as HTMLInputElement).value).toBe(
            'contraseña-incorrecta',
        );
    });

    it('renders the general message from a message-only 422', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({ message: 'Invalid credentials.' }),
        );
        renderLoginForm();

        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'secreta123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

        await screen.findByText('Invalid credentials.');
    });

    it('navigates to /agenda on successful login', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { id: 1, name: 'Ana', email: 'ana@clini.app' },
        });
        renderLoginForm();

        fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
            target: { value: 'ana@clini.app' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'secreta123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

        await screen.findByText('Agenda');
    });

    it('links to /registro', async () => {
        renderLoginForm();

        const link = await screen.findByRole('link', { name: 'Registrate' });
        expect(link.getAttribute('href')).toBe('/registro');
    });
});
